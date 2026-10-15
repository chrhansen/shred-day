import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResortSheet } from "../components/editor/resort-sheet";
import { NamedItemSheet } from "../components/editor/named-item-sheet";
import { shred } from "../services/shred";
const mockToast = jest.fn();
jest.mock("../contexts/auth", () => ({ useAuth: () => ({ user: { id: "user_demo" } }) }));
jest.mock("../components/ui/toast", () => ({ useToast: () => mockToast }));
jest.mock("../services/shred", () => ({ shred: { recentResorts: jest.fn(), resorts: jest.fn(), suggestResort: jest.fn(), createNamed: jest.fn() } }));
jest.mock("../components/ui/sheet", () => {
  const { View, Text, Pressable } = jest.requireActual("react-native");
  return { BottomSheet: ({ visible, title, children, onClose, dismissible, headerRight }: {
    visible: boolean; title: string; children: React.ReactNode; onClose: () => void; dismissible: boolean;
    headerRight?: React.ReactNode;
  }) => visible ? <View><Text>{title}</Text><Pressable disabled={!dismissible} onPress={onClose}><Text>Cancel</Text></Pressable>{headerRight}{children}</View> : null };
});
jest.mock("../components/ui", () => {
  const { View, Text, TextInput, Pressable } = jest.requireActual("react-native");
  return { Text, Icon: () => null,
    Field: ({ label, ...props }: { label: string }) => <TextInput accessibilityLabel={label} {...props} />,
    Button: ({ title, onPress, disabled, busy }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean }) =>
      <Pressable disabled={disabled || busy} onPress={onPress}><Text>{title}</Text></Pressable>,
    Notice: ({ error }: { error: Error }) => <View><Text>{error.message}</Text></View>,
  };
});
const solden = { id: "resort_1", name: "Sölden", country: "Austria", region: "Tyrol", latitude: null, longitude: null };
const hintertux = { ...solden, id: "resort_2", name: "Hintertux Glacier" };
beforeEach(() => {
  jest.clearAllMocks();
  (shred.recentResorts as jest.Mock).mockResolvedValue([solden]);
  (shred.resorts as jest.Mock).mockResolvedValue([]);
});
function sheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const selected = jest.fn(), closed = jest.fn();
  return { client, selected, closed, ...render(<QueryClientProvider client={client}>
    <ResortSheet visible selected={solden} onClose={closed} onSelect={selected} />
  </QueryClientProvider>) };
}
test("cancel preserves the current resort and selecting a recent resort dismisses", async () => {
  const view = sheet();
  fireEvent.press(view.getByText("Cancel"));
  expect(view.closed).toHaveBeenCalledTimes(1);
  expect(view.selected).not.toHaveBeenCalled();
  fireEvent.press(await view.findByText("Sölden"));
  expect(view.selected).toHaveBeenCalledWith(solden);
});
test("typing a new search clears old results before the next debounced response", async () => {
  (shred.resorts as jest.Mock).mockImplementation(async (query) => query === "Sol" ? [solden] : [hintertux]);
  const view = sheet();
  fireEvent.changeText(view.getByLabelText("Search resorts"), "Sol");
  await view.findByText("Sölden");
  fireEvent.changeText(view.getByLabelText("Search resorts"), "Hinter");
  expect(view.queryByText("Sölden")).toBeNull();
  await view.findByText("Hintertux Glacier");
  expect(shred.resorts).toHaveBeenLastCalledWith("Hinter", expect.any(AbortSignal));
});
test("a suggestion is selected only after the existing API confirms it", async () => {
  const created = { ...solden, id: "resort_new", name: "Schneebergl" };
  (shred.suggestResort as jest.Mock).mockResolvedValue(created);
  const view = sheet();
  fireEvent.changeText(view.getByLabelText("Search resorts"), "Schneebergl");
  fireEvent.press(await view.findByText('Suggest "Schneebergl"'));
  expect(view.getByLabelText("Resort name").props.value).toBe("Schneebergl");
  fireEvent.changeText(view.getByLabelText("Country"), "Austria");
  expect(view.selected).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Suggest and Use"));
  await waitFor(() => expect(view.selected).toHaveBeenCalledWith(created));
  expect(shred.suggestResort).toHaveBeenCalledWith("Schneebergl", "Austria");
  expect(mockToast).toHaveBeenCalledWith("Resort suggested and selected");
});
test("a failed inline ski creation keeps its name for retry and selects only after success", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const created = { id: "ski_new", name: "Atomic Bent 100" }, selected = jest.fn(), closed = jest.fn();
  (shred.createNamed as jest.Mock).mockRejectedValueOnce(new Error("Private server detail")).mockResolvedValueOnce(created);
  const view = render(<QueryClientProvider client={client}><NamedItemSheet visible kind="skis" onClose={closed} onCreated={selected} /></QueryClientProvider>);
  fireEvent.changeText(view.getByLabelText("Ski name"), created.name);
  fireEvent(view.getByLabelText("Ski name"), "submitEditing");
  await view.findByText("Couldn't add this ski. Check the name and try again.");
  expect(view.getByLabelText("Ski name").props.value).toBe(created.name);
  expect(selected).not.toHaveBeenCalled();
  expect(view.queryByText("Private server detail")).toBeNull();
  fireEvent.press(view.getByLabelText("Add ski"));
  await waitFor(() => expect(selected).toHaveBeenCalledWith(created));
  expect(closed).toHaveBeenCalledTimes(1);
  expect(shred.createNamed).toHaveBeenLastCalledWith("skis", created.name);
});

test("confirmed inline creation closes and selects while background refetch is still pending", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest.spyOn(client, "invalidateQueries").mockReturnValue(new Promise(() => {}));
  const item = { id: "ski_confirmed", name: "Atomic Bent 100" }, selected = jest.fn(), closed = jest.fn();
  (shred.createNamed as jest.Mock).mockResolvedValue(item);
  const view = render(<QueryClientProvider client={client}><NamedItemSheet visible kind="skis" onClose={closed} onCreated={selected} /></QueryClientProvider>);
  fireEvent.changeText(view.getByLabelText("Ski name"), item.name);
  fireEvent.press(view.getByLabelText("Add ski"));
  await waitFor(() => expect(closed).toHaveBeenCalledTimes(1));
  expect(selected).toHaveBeenCalledWith(item);
  expect(client.getQueryData(["skis", "user_demo"])).toEqual([item]);
});

test("a confirmed resort suggestion selects without waiting for background refetch", async () => {
  const item = { ...solden, id: "resort_new", name: "Schneebergl" };
  (shred.suggestResort as jest.Mock).mockResolvedValue(item);
  const view = sheet();
  jest.spyOn(view.client, "invalidateQueries").mockReturnValue(new Promise(() => {}));
  fireEvent.press(await view.findByText("Not listed? Suggest a resort"));
  fireEvent.changeText(view.getByLabelText("Resort name"), item.name);
  fireEvent.changeText(view.getByLabelText("Country"), "Austria");
  fireEvent.press(view.getByText("Suggest and Use"));
  await waitFor(() => expect(view.closed).toHaveBeenCalledTimes(1));
  expect(view.selected).toHaveBeenCalledWith(item);
});
