import { ActionSheetIOS, Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GearScreen } from "../components/gear/gear-screen";
import { shred } from "../services/shred";
import { ApiError } from "../lib/api";
let mockKind = "skis";
const mockToast = jest.fn();
jest.mock("expo-router", () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  Stack: { Screen: () => null }, useLocalSearchParams: () => ({ kind: mockKind }) }));
jest.mock("../contexts/auth", () => ({ useAuth: () => ({ user: { id: "user_demo", available_seasons: [0, -1] } }) }));
jest.mock("../components/ui/toast", () => ({ useToast: () => mockToast }));
jest.mock("../components/gear/swipe-row", () => ({ GearSwipeRow: jest.requireActual("react-native").View }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: jest.requireActual("react-native").View }));
jest.mock("../services/shred", () => ({ shred: { skis: jest.fn(), tags: jest.fn(), days: jest.fn(), createNamed: jest.fn(), renameSki: jest.fn(), deleteNamed: jest.fn() } }));
jest.mock("../components/ui", () => {
  const { View, Text, TextInput, Pressable } = jest.requireActual("react-native");
  return { Text, Icon: () => null, Segmented: () => null, EmptyState: () => null,
    Field: ({ label, ...props }: { label: string }) => <TextInput accessibilityLabel={label} {...props} />,
    IconButton: ({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress: () => void }) =>
      <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} />,
    Button: ({ title, onPress, disabled, busy }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean }) =>
      <Pressable disabled={disabled || busy} onPress={onPress}><Text>{title}</Text></Pressable>,
    Notice: ({ error }: { error: Error }) => <View><Text>{error.message}</Text></View>,
  };
});
const ski = { id: "ski_1", name: "Atomic Bent 100" }, tag = { id: "tag_1", name: "Powder" };
beforeEach(() => {
  jest.clearAllMocks(); mockKind = "skis";
  (shred.skis as jest.Mock).mockResolvedValue([ski]);
  (shred.tags as jest.Mock).mockResolvedValue([tag]);
  (shred.days as jest.Mock).mockImplementation(async (season) => [{ id: "day_" + season, ski_names: [ski.name], tag_names: [tag.name] }]);
});
function gear() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return { client, ...render(<QueryClientProvider client={client}><GearScreen /></QueryClientProvider>) };
}
test("usage is counted across available seasons and failed renames preserve the row", async () => {
  let choose!: (index: number) => void;
  const actions = jest.spyOn(ActionSheetIOS, "showActionSheetWithOptions").mockImplementation((_, callback) => { choose = callback; });
  (shred.renameSki as jest.Mock).mockRejectedValue(new Error("Private failure detail"));
  const view = gear();
  await view.findByText("2 days");
  fireEvent.press(view.getByLabelText("Actions for Atomic Bent 100"));
  act(() => choose(1));
  await view.findByLabelText("Ski name");
  fireEvent.changeText(view.getByLabelText("Ski name"), "Renamed ski");
  fireEvent.press(view.getByText("Save"));
  await view.findByText("Couldn't rename this ski. Your original name is unchanged. Try again.");
  fireEvent.press(view.getByText("Cancel"));
  expect(view.getByText("Atomic Bent 100")).toBeTruthy();
  expect(view.queryByText("Renamed ski")).toBeNull();
  expect(view.queryByText("Private failure detail")).toBeNull();
  actions.mockRestore();
});
test("tag actions omit unsupported rename and a rejected deletion keeps the tag", async () => {
  mockKind = "tags";
  let choose!: (index: number) => void;
  const actions = jest.spyOn(ActionSheetIOS, "showActionSheetWithOptions").mockImplementation((_, callback) => { choose = callback; });
  const prompt = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  (shred.deleteNamed as jest.Mock).mockRejectedValue(new ApiError("Cannot delete used tag", 422));
  const view = gear();
  await view.findByText("2 days");
  fireEvent.press(view.getByLabelText("Actions for Powder"));
  expect(actions.mock.calls[0][0].options).toEqual(["Cancel", "Delete"]);
  act(() => choose(1));
  expect(prompt.mock.calls[0][1]).toContain("2 logged days");
  act(() => prompt.mock.calls[0][2]!.find((button) => button.text === "Delete")!.onPress!());
  await waitFor(() => expect(prompt).toHaveBeenCalledWith("Couldn't delete this tag", expect.stringContaining("still used"), expect.any(Array)));
  expect(view.getByText("Powder")).toBeTruthy();
  expect(mockToast).not.toHaveBeenCalled();
  actions.mockRestore(); prompt.mockRestore();
});

test("confirmed gear creation unlocks the form before its background queries complete", async () => {
  const item = { id: "ski_created", name: "Völkl Mantra" };
  (shred.createNamed as jest.Mock).mockResolvedValue(item);
  const view = gear();
  await view.findByText(ski.name);
  jest.spyOn(view.client, "invalidateQueries").mockReturnValue(new Promise(() => {}));
  fireEvent.changeText(view.getByLabelText("New ski"), item.name);
  fireEvent.press(view.getByText("Add"));
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith(item.name + " added"));
  expect(view.getByLabelText("New ski").props.editable).toBe(true);
  expect(view.getByText(item.name)).toBeTruthy();
});
