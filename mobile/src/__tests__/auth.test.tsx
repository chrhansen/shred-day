import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthProvider, useAuth } from "../contexts/auth";
import { shred } from "../services/shred";
import { api, ApiError } from "../lib/api";
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device",
}));
jest.mock("../services/shred", () => ({
  shred: {
    account: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
}));
jest.mock("../lib/provider-login", () => ({ providerProof: jest.fn() }));
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(useAuth, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    ),
  });
}
const session = {
  token: "session-token",
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  authentication_method: "password",
};
const account = {
  id: "usr_1",
  email: "skier@example.com",
  username: null,
  avatar_url: null,
  available_seasons: [0],
  season_start_day: "09-01",
};
beforeEach(() => {
  jest.clearAllMocks();
  api.token = null;
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  (shred.account as jest.Mock).mockResolvedValue(account);
});
test("restores a valid secure session and loads its account", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify(session),
  );
  const { result } = mount();
  await waitFor(() => expect(result.current.user?.email).toBe(account.email));
  expect(api.token).toBe(session.token);
});
test("expired credentials are discarded", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify({ ...session, expires_at: "2020-01-01" }),
  );
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.user).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  expect(shred.account).not.toHaveBeenCalled();
});
test("a temporary connection failure preserves credentials for retry", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify(session),
  );
  (shred.account as jest.Mock).mockRejectedValueOnce(
    new Error("Network unavailable"),
  );
  const { result } = mount();
  await waitFor(() => expect(result.current.error).toBe("Network unavailable"));
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  await act(async () => {
    result.current.retry();
  });
  await waitFor(() => expect(result.current.user?.email).toBe(account.email));
});
test("a revoked session removes stored credentials", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify(session),
  );
  (shred.account as jest.Mock).mockRejectedValueOnce(
    new ApiError("Expired", 401),
  );
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.user).toBeNull();
  expect(api.token).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});
test("logout clears secure credentials and cached account data even offline", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify(session),
  );
  (shred.signOut as jest.Mock).mockRejectedValueOnce(new Error("Offline"));
  const { result } = mount();
  await waitFor(() => expect(result.current.user?.email).toBe(account.email));
  await act(async () => {
    await result.current.logout();
  });
  expect(result.current.user).toBeNull();
  expect(api.token).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});
test("new sessions are stored with device-only keychain access", async () => {
  (shred.signIn as jest.Mock).mockResolvedValue(session);
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => {
    await result.current.passwordLogin(account.email, "password");
  });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    "shredday.mobile.session",
    JSON.stringify(session),
    { keychainAccessible: "device" },
  );
  expect(result.current.user?.id).toBe(account.id);
});
