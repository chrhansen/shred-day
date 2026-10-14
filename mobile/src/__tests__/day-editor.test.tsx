import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePreventRemove } from "expo-router/react-navigation";
import { router } from "expo-router";
import { DayEditor } from "../components/day-editor";
import { shred } from "../services/shred";

const mockCommit = jest.fn();
const mockDispatch = jest.fn();
const mockRefresh = jest.fn();
const mockPhotoState = { photos: [], pending: false, picking: false, error: null,
  load: jest.fn(), commit: mockCommit, pick: jest.fn(), remove: jest.fn(), retry: jest.fn(), openSettings: jest.fn() };
jest.mock("expo-router", () => ({ router: { replace: jest.fn(), dismissTo: jest.fn(), back: jest.fn(), canGoBack: () => true },
  Stack: { Screen: () => null }, useNavigation: () => ({ dispatch: mockDispatch }) }));
jest.mock("expo-router/react-navigation", () => ({ usePreventRemove: jest.fn() }));
jest.mock("../contexts/auth", () => ({ useAuth: () => ({ user: { id: "user_demo", season_start_day: "09-01" }, refresh: mockRefresh }) }));
jest.mock("../hooks/use-day-photos", () => ({ useDayPhotos: () => mockPhotoState }));
jest.mock("../components/ui/toast", () => ({ useToast: () => jest.fn() }));
jest.mock("../components/editor/editor-photos", () => ({ EditorPhotos: () => null }));
jest.mock("../components/editor/resort-sheet", () => ({ ResortSheet: () => null }));
jest.mock("../components/editor/named-item-sheet", () => ({ NamedItemSheet: () => null }));
jest.mock("../components/ui/calendar", () => ({ Calendar: () => null }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: jest.requireActual("react-native").View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
jest.mock("../services/shred", () => ({ shred: { day: jest.fn(), days: jest.fn(), skis: jest.fn(), tags: jest.fn(), recentResorts: jest.fn(), saveDay: jest.fn() } }));
jest.mock("../components/ui", () => {
  const { View, Text, TextInput, Pressable } = jest.requireActual("react-native");
  return { Text, Screen: View, Icon: () => null,
    Field: ({ label, ...props }: { label: string; hideLabel?: boolean }) => <TextInput accessibilityLabel={label} {...props} />,
    Button: ({ title, onPress, disabled, busy }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean }) =>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress}><Text>{title}</Text></Pressable>,
    Pill: ({ title, role, selected, onPress }: { title: string; role?: string; selected?: boolean; onPress: () => void }) =>
      <Pressable accessibilityRole={role || "checkbox"} accessibilityLabel={title} accessibilityState={{ selected }} onPress={onPress}><Text>{title}</Text></Pressable>,
    Notice: ({ error }: { error: Error }) => <Text>{error.message}</Text>,
  };
});
const resort = { id: "resort_1", name: "Sölden", country: "Austria", latitude: null, longitude: null };
beforeEach(() => {
  notifyManager.setNotifyFunction((callback) => { act(callback); });
  jest.clearAllMocks();
  mockPhotoState.pending = false;
  (shred.skis as jest.Mock).mockResolvedValue([]);
  (shred.tags as jest.Mock).mockResolvedValue([]);
  (shred.recentResorts as jest.Mock).mockResolvedValue([resort]);
  (shred.days as jest.Mock).mockResolvedValue([]);
  mockRefresh.mockResolvedValue(undefined);
});
afterEach(() => notifyManager.setNotifyFunction((callback) => callback()));
function editor(id?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  return { ...render(<QueryClientProvider client={client}><DayEditor id={id} initialDate="2026-10-04" /></QueryClientProvider>), client };
}
test("missing resort is validated on save without sending a request", async () => {
  const view = editor();
  await view.findByLabelText("Sölden");
  expect(view.queryByText("Choose the resort you skied.")).toBeNull();
  fireEvent.press(view.getByText("Save Day"));
  expect(view.getByText("Choose the resort you skied.")).toBeTruthy();
  expect(shred.saveDay).not.toHaveBeenCalled();
});
test("failed save retains edited fields and retries with the same selected date", async () => {
  (shred.saveDay as jest.Mock).mockRejectedValueOnce(new Error("Sensitive server details"))
    .mockResolvedValueOnce({ id: "day_saved", resort, date: "2026-10-04" });
  const view = editor();
  fireEvent.press(await view.findByLabelText("Sölden"));
  fireEvent.changeText(view.getByLabelText("Notes"), "Good turns with friends.");
  fireEvent.press(view.getByText("Save Day"));
  await view.findByText("Couldn't save this day. Check your connection and try again.");
  expect(view.getByLabelText("Notes").props.value).toBe("Good turns with friends.");
  expect(view.queryByText("Sensitive server details")).toBeNull();
  expect(mockCommit).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Save Day"));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: "/day/[id]", params: { id: "day_saved" } }));
  expect(shred.saveDay).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-10-04", resort_id: resort.id, notes: "Good turns with friends." }), undefined);
  expect(mockCommit).toHaveBeenCalledTimes(1);
  expect(view.client.getQueryData(["day", "day_saved", "user_demo"])).toEqual(expect.objectContaining({ id: "day_saved" }));
});
test("photos block save and notes are capped at500 characters", async () => {
  mockPhotoState.pending = true;
  const view = editor();
  fireEvent.press(await view.findByLabelText("Sölden"));
  fireEvent.changeText(view.getByLabelText("Notes"), "a".repeat(501));
  expect(view.getByLabelText("Notes").props.value).toHaveLength(500);
  fireEvent.press(view.getByText("Save Day"));
  expect(shred.saveDay).not.toHaveBeenCalled();
});
test("dirty navigation requires explicit discard before dispatching the original action", async () => {
  const prompt = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = editor();
  fireEvent.changeText(view.getByLabelText("Notes"), "Unfinished notes");
  const [blocked, callback] = (usePreventRemove as jest.Mock).mock.calls.at(-1);
  expect(blocked).toBe(true);
  const action = { type: "GO_BACK" };
  callback({ data: { action } });
  expect(prompt).toHaveBeenCalledWith("Discard changes?", "This day won't be saved.", expect.any(Array));
  expect(mockDispatch).not.toHaveBeenCalled();
  const buttons = prompt.mock.calls[0][2]!;
  buttons.find((button) => button.text === "Discard")!.onPress!();
  expect(mockDispatch).toHaveBeenCalledWith(action);
  prompt.mockRestore();
});
test("editing hydrates once and a background refresh cannot overwrite unsaved notes", async () => {
  const saved = { id: "day_edit", date: "2026-10-04", resort, skis: [], tags: [], photos: [],
    notes: "Original notes", day_number: 1, shared_at: null };
  (shred.day as jest.Mock).mockResolvedValue(saved);
  const view = editor(saved.id);
  await waitFor(() => expect(view.getByLabelText("Notes").props.value).toBe("Original notes"));
  expect((usePreventRemove as jest.Mock).mock.calls.at(-1)[0]).toBe(false);
  fireEvent.changeText(view.getByLabelText("Notes"), "My unfinished draft");
  act(() => view.client.setQueryData(["day", saved.id, "user_demo"], { ...saved, notes: "Background refresh" }));
  expect(view.getByLabelText("Notes").props.value).toBe("My unfinished draft");
  expect((usePreventRemove as jest.Mock).mock.calls.at(-1)[0]).toBe(true);
  (shred.saveDay as jest.Mock).mockResolvedValue(saved);
  fireEvent.press(view.getByText("Update Day"));
  await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith({ pathname: "/day/[id]", params: { id: saved.id } }));
  expect(router.replace).not.toHaveBeenCalled();
});
