import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import DeleteAccountScreen from "../app/settings/delete";
import { shred } from "../services/shred";
import { ApiError } from "../lib/api";

const mockAuth = {
  user: { id: "user_demo", email: "mara.winter@example.test", available_seasons: [0] },
  reauthenticationMethod: "password", reauthenticate: jest.fn(), markAccountDeleted: jest.fn(),
};
jest.mock("../contexts/auth", () => ({ useAuth: () => mockAuth }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));
jest.mock("../services/shred", () => ({ shred: { days: jest.fn(), deleteAccount: jest.fn() } }));
jest.mock("../components/auth/provider-buttons", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return { ProviderButtons: ({ onPress }: { onPress: () => void }) => <Pressable accessibilityRole="button" onPress={onPress}><Text>Continue with Google</Text></Pressable> };
});
jest.mock("../components/ui", () => {
  const { View, Text, TextInput, Pressable } = jest.requireActual("react-native");
  return { Text, Screen: View, Icon: () => null, colors: {},
    BottomSheet: ({ visible, title, children }: { visible: boolean; title: string; children: React.ReactNode }) =>
      visible ? <View><Text>{title}</Text>{children}</View> : null,
    Field: ({ label, error, ...props }: { label: string; error?: string }) => <View>
      <TextInput accessibilityLabel={label} {...props} />{error && <Text>{error}</Text>}
    </View>,
    Button: ({ title, onPress, disabled, busy }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean }) =>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress}><Text>{title}</Text></Pressable>,
    Notice: ({ message }: { message: string }) => <Text>{message}</Text>,
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  notifyManager.setNotifyFunction((callback) => { act(callback); });
  mockAuth.reauthenticationMethod = "password";
  mockAuth.reauthenticate.mockResolvedValue(undefined);
  (shred.days as jest.Mock).mockResolvedValue([]);
  (shred.deleteAccount as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => notifyManager.setNotifyFunction((callback) => callback()));
function deletion() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}><DeleteAccountScreen /></QueryClientProvider>);
}
function continueDeletion(view: ReturnType<typeof deletion>) {
  fireEvent.changeText(view.getByLabelText("Type DELETE to confirm"), "DELETE");
  fireEvent.press(view.getByText("Continue"));
}
test("exact DELETE confirmation and completed sign-in proof precede account deletion", async () => {
  let prove!: () => void;
  mockAuth.reauthenticate.mockImplementation(() => new Promise<void>((resolve) => { prove = resolve; }));
  const view = deletion();
  fireEvent.changeText(view.getByLabelText("Type DELETE to confirm"), "delete");
  fireEvent.press(view.getByText("Continue"));
  expect(view.queryByText("Confirm it's you")).toBeNull();
  expect(shred.deleteAccount).not.toHaveBeenCalled();
  continueDeletion(view);
  fireEvent.changeText(view.getByLabelText("Password for mara.winter@example.test"), "synthetic-password");
  fireEvent.press(view.getByText("Delete Account"));
  expect(mockAuth.reauthenticate).toHaveBeenCalledWith("synthetic-password");
  expect(shred.deleteAccount).not.toHaveBeenCalled();
  await act(async () => { prove(); });
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account-deleted"));
  expect(shred.deleteAccount).toHaveBeenCalledTimes(1);
  expect(mockAuth.markAccountDeleted).toHaveBeenCalledTimes(1);
});
test("a wrong password leaves the account intact and exposes a field error", async () => {
  mockAuth.reauthenticate.mockRejectedValue(new ApiError("Internal proof detail", 401));
  const view = deletion();
  continueDeletion(view);
  fireEvent.changeText(view.getByLabelText("Password for mara.winter@example.test"), "wrong-password");
  fireEvent.press(view.getByText("Delete Account"));
  await view.findByText("That password isn't right. Try again.");
  expect(shred.deleteAccount).not.toHaveBeenCalled();
  expect(mockAuth.markAccountDeleted).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(view.queryByText("Internal proof detail")).toBeNull();
});
test("canceling provider confirmation never sends a destructive request", async () => {
  mockAuth.reauthenticationMethod = "google";
  mockAuth.reauthenticate.mockRejectedValue({ code: "SIGN_IN_CANCELLED" });
  const view = deletion();
  continueDeletion(view);
  fireEvent.press(view.getByText("Continue with Google"));
  await view.findByText("Google sign-in was canceled. Nothing was changed.");
  expect(shred.deleteAccount).not.toHaveBeenCalled();
  expect(mockAuth.markAccountDeleted).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});
test("a failed deletion keeps confirmation and retry requires another completed proof", async () => {
  const prompt = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  (shred.deleteAccount as jest.Mock).mockRejectedValueOnce(new Error("Private failure detail")).mockResolvedValueOnce(undefined);
  const view = deletion();
  continueDeletion(view);
  fireEvent.changeText(view.getByLabelText("Password for mara.winter@example.test"), "synthetic-password");
  fireEvent.press(view.getByText("Delete Account"));
  await waitFor(() => expect(prompt).toHaveBeenCalledWith("Couldn't delete your account", expect.any(String), expect.any(Array)));
  expect(view.getByText("Confirm it's you")).toBeTruthy();
  expect(mockAuth.markAccountDeleted).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Delete Account"));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account-deleted"));
  expect(mockAuth.reauthenticate).toHaveBeenCalledTimes(2);
  expect(shred.deleteAccount).toHaveBeenCalledTimes(2);
  prompt.mockRestore();
});
