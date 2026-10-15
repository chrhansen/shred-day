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
beforeEach(() => jest.clearAllMocks());

describe.each([["welcome", AuthScreen], ["email", EmailAuthScreen]] as const)("%s provider notices", (_name, Screen) => {
  test("an ambiguous email offers support without asking the user to connect a provider", async () => {
    mockSocialLogin.mockRejectedValue(new ApiError("Multiple accounts use this email. Please contact support.", 401));
    const view = render(<Screen />);
    fireEvent.press(view.getByText("Continue with Apple"));
    await view.findByText("More than one journal uses this email. Contact support so we can help you sign in.");
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

  test("unverified Google email is explained without sending the user to another login flow", async () => {
    mockSocialLogin.mockRejectedValue(new ApiError("A verified email is required to sign in", 401));
    const view = render(<Screen />);
    fireEvent.press(view.getByText("Continue with Google"));
    await view.findByText("Google didn't share a verified email address. Please try another sign-in method.");
    expect(mockSocialLogin).toHaveBeenCalledWith("google");
    expect(view.queryByText(/Settings > Sign-in methods/)).toBeNull();
  });
});
