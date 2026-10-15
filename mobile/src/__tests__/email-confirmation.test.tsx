import { fireEvent, render, waitFor } from "@testing-library/react-native";
import EmailAuthScreen from "../app/auth/email";
import { ApiError } from "../lib/api";
import { shred } from "../services/shred";

const mockAuth = { registerEmail: jest.fn(), passwordLogin: jest.fn(), socialLogin: jest.fn(),
  expiredIdentity: null as { email: string } | null, emailConfirmationRequired: false };
let mockParams: { mode?: string } = {};
jest.mock("expo-router", () => ({ useLocalSearchParams: () => mockParams }));
jest.mock("../contexts/auth", () => ({ useAuth: () => mockAuth }));
jest.mock("../services/shred", () => ({ shred: { requestEmailConfirmation: jest.fn() } }));
jest.mock("../components/auth/brand", () => ({ LegalLinks: () => null }));
jest.mock("../components/auth/provider-buttons", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return { ProviderButtons: ({ onPress, busy }: { onPress: (provider: string) => void; busy: unknown }) =>
    <Pressable disabled={Boolean(busy)} onPress={() => onPress("apple")}><Text>Continue with Apple</Text></Pressable> };
});
jest.mock("../components/ui", () => {
  const { Text, View, Pressable, TextInput } = jest.requireActual("react-native");
  return { Text, Screen: View, colors: {}, IconButton: () => null,
    Segmented: ({ onChange }: { onChange: (mode: string) => void }) =>
      <Pressable accessibilityLabel="Choose Sign Up" onPress={() => onChange("signup")}><Text>Sign Up</Text></Pressable>,
    Field: ({ label, readOnly, ...props }: { label: string; readOnly: boolean }) =>
      <TextInput {...props} accessibilityLabel={label} editable={!readOnly} />,
    Button: ({ title, onPress, disabled, busy }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean }) =>
      <Pressable disabled={disabled || busy} onPress={onPress}><Text>{title}</Text></Pressable>,
    Notice: ({ message }: { message: string }) => <Text>{message}</Text>,
  };
});
beforeEach(() => {
  jest.resetAllMocks(); mockParams = {};
  mockAuth.expiredIdentity = null; mockAuth.emailConfirmationRequired = false;
  (shred.requestEmailConfirmation as jest.Mock).mockResolvedValue({ message: "Generic response" });
});

test("signup collects email only, then waits for mailbox proof and returns to password login", async () => {
  mockParams = { mode: "signup" };
  mockAuth.registerEmail.mockResolvedValue(undefined);
  const view = render(<EmailAuthScreen />);
  expect(view.queryByLabelText("Password")).toBeNull();
  fireEvent.changeText(view.getByLabelText("Email"), " skier@example.test ");
  fireEvent.press(view.getByText("Send confirmation link"));
  await view.findByText("Check your email");
  expect(mockAuth.registerEmail).toHaveBeenCalledWith("skier@example.test");
  expect(mockAuth.passwordLogin).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Back to Log In"));
  expect(view.getByLabelText("Email").props.value).toBe(" skier@example.test ");
  expect(view.getByLabelText("Password").props.value).toBe("");
});

test("an unconfirmed password offers an explicit confirmation request and clears the entered password", async () => {
  mockAuth.passwordLogin.mockRejectedValue(new ApiError("Confirm your email.", 403, "email_confirmation_required"));
  const view = render(<EmailAuthScreen />);
  fireEvent.changeText(view.getByLabelText("Email"), "skier@example.test");
  fireEvent.changeText(view.getByLabelText("Password"), "unconfirmed-password");
  fireEvent.press(view.getByText("Log In"));
  await view.findByText("Confirm your email");
  expect(shred.requestEmailConfirmation).not.toHaveBeenCalled();
  expect(view.queryByLabelText("Password")).toBeNull();
  fireEvent.press(view.getByText("Send confirmation link"));
  await view.findByText("Check your email");
  expect(shred.requestEmailConfirmation).toHaveBeenCalledWith("skier@example.test");
  fireEvent.press(view.getByText("Back to Log In"));
  expect(view.getByLabelText("Password").props.value).toBe("");
});

test("resend rate limits stay recoverable and provider sign-in needs no extra confirmation", async () => {
  mockParams = { mode: "confirm" };
  mockAuth.expiredIdentity = { email: "skier@example.test" };
  (shred.requestEmailConfirmation as jest.Mock).mockRejectedValueOnce(new ApiError("Too many requests", 429));
  const view = render(<EmailAuthScreen />);
  fireEvent.press(view.getByText("Send confirmation link"));
  await view.findByText("Please wait before requesting another confirmation link.");
  fireEvent.press(view.getByText("Continue with Apple"));
  await waitFor(() => expect(mockAuth.socialLogin).toHaveBeenCalledWith("apple"));
  expect(shred.requestEmailConfirmation).toHaveBeenCalledTimes(1);
  expect(mockAuth.passwordLogin).not.toHaveBeenCalled();
});

test("a failed signup does not claim a confirmation email was sent", async () => {
  mockParams = { mode: "signup" };
  mockAuth.registerEmail.mockRejectedValue(new ApiError("Email already taken", 422));
  const view = render(<EmailAuthScreen />);
  fireEvent.changeText(view.getByLabelText("Email"), "skier@example.test");
  fireEvent.press(view.getByText("Send confirmation link"));
  await view.findByText("Couldn't create this account. Check your details or try logging in.");
  expect(view.queryByText("Check your email")).toBeNull();
});

test("existing accounts can request confirmation without entering an old provisional password", async () => {
  const view = render(<EmailAuthScreen />);
  fireEvent.changeText(view.getByLabelText("Email"), "skier@example.test");
  fireEvent.press(view.getByText("Need to confirm your email?"));
  await view.findByText("Confirm your email");
  expect(mockAuth.passwordLogin).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Send confirmation link"));
  await view.findByText("Check your email");
  expect(shred.requestEmailConfirmation).toHaveBeenCalledWith("skier@example.test");
});
