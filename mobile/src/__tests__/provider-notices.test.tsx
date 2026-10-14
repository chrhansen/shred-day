import { fireEvent, render } from "@testing-library/react-native";
import AuthScreen from "../app/auth";
import EmailAuthScreen from "../app/auth/email";
import { ApiError } from "../lib/api";

const mockSocialLogin = jest.fn();
jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock("../contexts/auth", () => ({ useAuth: () => ({ socialLogin: mockSocialLogin }) }));
jest.mock("../components/auth/brand", () => ({ Brand: () => null, LegalLinks: () => null }));
jest.mock("../components/auth/session-expired", () => ({ SessionExpired: () => null }));
jest.mock("../components/auth/provider-buttons", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return { ProviderButtons: ({ onPress }: { onPress: (provider: string) => void }) =>
    <><Pressable onPress={() => onPress("apple")}><Text>Continue with Apple</Text></Pressable>
      <Pressable onPress={() => onPress("google")}><Text>Continue with Google</Text></Pressable></> };
});
jest.mock("../components/ui", () => {
  const { Text, View, Pressable, TextInput } = jest.requireActual("react-native");
  return { Text, Screen: View, colors: {}, IconButton: () => null, Segmented: () => null,
    Field: ({ label }: { label: string }) => <TextInput accessibilityLabel={label} />,
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      <Pressable onPress={onPress}><Text>{title}</Text></Pressable>,
    Notice: ({ message }: { message: string }) => <Text>{message}</Text>,
  };
});
const existingAccount = "Sign in to your existing account before linking this login. If you previously used Google on the website, sign in there once and then retry.";
const connectInstructions = "This Apple login isn't connected to your existing account. Sign in with Google or email, then open Settings > Sign-in methods to connect Apple.";
beforeEach(() => jest.clearAllMocks());

describe.each([["welcome", AuthScreen], ["email", EmailAuthScreen]] as const)("%s provider notices", (_name, Screen) => {
  test("an existing-account rejection explains how to connect Apple instead of blaming the connection", async () => {
    mockSocialLogin.mockRejectedValue(new ApiError(existingAccount, 401));
    const view = render(<Screen />);
    fireEvent.press(view.getByText("Continue with Apple"));
    await view.findByText(connectInstructions);
    expect(mockSocialLogin).toHaveBeenCalledWith("apple");
    expect(view.queryByText(/Check your connection/)).toBeNull();
  });

  test("unknown server details are never shown as a provider notice", async () => {
    mockSocialLogin.mockRejectedValue(new ApiError("Private server details", 500));
    const view = render(<Screen />);
    fireEvent.press(view.getByText("Continue with Apple"));
    await view.findByText("Couldn't sign in with Apple. Please try again or use another sign-in method.");
    expect(view.queryByText("Private server details")).toBeNull();
  });

  test("a legacy Google account is directed to website Google sign-in before retrying mobile", async () => {
    mockSocialLogin.mockRejectedValue(new ApiError(existingAccount, 401));
    const view = render(<Screen />);
    fireEvent.press(view.getByText("Continue with Google"));
    await view.findByText("Sign in with Google on shred.day once, then return to the app and try again.");
    expect(mockSocialLogin).toHaveBeenCalledWith("google");
    expect(view.queryByText(/Settings > Sign-in methods/)).toBeNull();
  });
});
