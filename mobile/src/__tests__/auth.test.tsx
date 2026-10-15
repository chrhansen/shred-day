import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthProvider, useAuth } from "../contexts/auth";
import { shred } from "../services/shred";
import { api, ApiError } from "../lib/api";
import { providerProof } from "../lib/provider-login";
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
    providerSignIn: jest.fn(),
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
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const otherAccount = { ...account, id: "usr_2", email: "other@example.test" };
const otherSession = { ...session, token: "new-account-session" };
function mockSessionAccounts() {
  (shred.account as jest.Mock).mockImplementation(async () => api.token === otherSession.token ? otherAccount : account);
  return jest.spyOn(global, "fetch").mockImplementation(async (_url, options) => ({
    ok: true, status: options?.method === "DELETE" ? 204 : 200,
    json: async () => (options?.headers as Record<string, string>)?.Authorization === `Bearer ${otherSession.token}` ? otherAccount : account,
  } as Response));
}
beforeEach(() => {
  jest.resetAllMocks();
  api.token = null;
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  (shred.account as jest.Mock).mockResolvedValue(account);
  mockSessionAccounts();
});
afterEach(() => { jest.restoreAllMocks(); });
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
  await waitFor(() => expect(result.current.error).toBe("Could not reach Shred.Day. Check your connection and try again."));
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
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Offline"));
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
    expect.any(String),
    { keychainAccessible: "device" },
  );
  expect(JSON.parse((SecureStore.setItemAsync as jest.Mock).mock.calls[0][1])).toMatchObject(session);
  expect(result.current.user?.id).toBe(account.id);
});
test("email signup waits for confirmation without storing or loading an authenticated account", async () => {
  (shred.signUp as jest.Mock).mockResolvedValue({ confirmation_required: true, message: "Check your email." });
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => { await result.current.registerEmail(account.email); });
  expect(shred.signUp).toHaveBeenCalledWith(account.email);
  expect(result.current.user).toBeNull();
  expect(result.current.session).toBeNull();
  expect(api.token).toBeNull();
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  expect(shred.account).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});
test("an unconfirmed password rejection never becomes an authenticated session", async () => {
  (shred.signIn as jest.Mock).mockRejectedValue(new ApiError("Confirm your email.", 403, "email_confirmation_required"));
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => { await expect(result.current.passwordLogin(account.email, "password")).rejects.toMatchObject({ code: "email_confirmation_required" }); });
  expect(result.current.user).toBeNull();
  expect(api.token).toBeNull();
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});
test("an existing password session that needs confirmation loses access and offers email recovery", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ ...session, identity: account }));
  (shred.account as jest.Mock).mockRejectedValue(new ApiError("Confirm your email.", 401, "email_confirmation_required"));
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.emailConfirmationRequired).toBe(true);
  expect(result.current.expiredIdentity?.email).toBe(account.email);
  expect(result.current.user).toBeNull();
  expect(api.token).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});

test("an expired session keeps a non-authenticating identity for the recovery screen", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ ...session, expires_at: "2020-01-01", identity: account }));
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.expired).toBe(true);
  expect(result.current.expiredIdentity?.email).toBe(account.email);
  expect(api.token).toBeNull();
  expect(shred.account).not.toHaveBeenCalled();
  act(() => result.current.resetExpired());
  expect(result.current.expiredIdentity).toBeNull();
});

test("linking a provider preserves the preexisting reauthentication method", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(session));
  (providerProof as jest.Mock).mockResolvedValue({ provider: "apple", identity_token: "provider-proof" });
  (shred.providerSignIn as jest.Mock).mockResolvedValue({ ...session, token: "linked-session", authentication_method: "apple" });
  const { result } = mount();
  await waitFor(() => expect(result.current.user?.id).toBe(account.id));
  await act(async () => { await result.current.socialLogin("apple", true); });
  expect(result.current.confirmedMethods).toEqual(["password", "apple"]);
  expect(result.current.reauthenticationMethod).toBe("password");
});

test("reauthentication rejects a different provider account without switching the journal", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ ...session, authentication_method: "google" }));
  (providerProof as jest.Mock).mockResolvedValue({ provider: "google", identity_token: "provider-proof" });
  (shred.providerSignIn as jest.Mock).mockResolvedValue({ ...session, token: "confirmation-session", authentication_method: "google" });
  const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true, status: 200,
    json: async () => ({ ...account, id: "usr_other" }) } as Response)
    .mockResolvedValueOnce({ ok: true, status: 204 } as Response);
  try {
    const { result } = mount();
    await waitFor(() => expect(result.current.user?.id).toBe(account.id));
    await act(async () => { await expect(result.current.reauthenticate()).rejects.toThrow("Use the sign-in connected to this account."); });
    expect(result.current.user?.id).toBe(account.id);
    expect(api.token).toBe(session.token);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v1/mobile/sessions");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
  } finally { fetchMock.mockRestore(); }
});

test("a slow older login cannot replace a newer account and its unused session is revoked", async () => {
  const response = deferred<typeof session>();
  (shred.signIn as jest.Mock).mockImplementationOnce(() => response.promise).mockResolvedValueOnce(otherSession);
  const fetchMock = mockSessionAccounts();
  try {
    const { result } = mount();
    await waitFor(() => expect(result.current.ready).toBe(true));
    let older!: Promise<unknown>;
    act(() => { older = result.current.passwordLogin(account.email, "password").catch(cause => cause); });
    await act(async () => { await result.current.passwordLogin(otherAccount.email, "password"); });
    expect(result.current.user?.id).toBe(otherAccount.id);
    await act(async () => { response.resolve(session); await older; });
    expect(result.current.user?.id).toBe(otherAccount.id);
    expect(api.token).toBe(otherSession.token);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/mobile/sessions"), expect.objectContaining({
      method: "DELETE", headers: expect.objectContaining({ Authorization: `Bearer ${session.token}` }),
    }));
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(expect.any(String), JSON.stringify(session), expect.anything());
  } finally { fetchMock.mockRestore(); }
});

test("a late logout response cannot clear a newer login", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(session));
  const response = deferred<Response>();
  (shred.signIn as jest.Mock).mockResolvedValue(otherSession);
  const fetchMock = mockSessionAccounts();
  fetchMock.mockImplementationOnce(() => response.promise);
  try {
    const { result } = mount();
    await waitFor(() => expect(result.current.user?.id).toBe(account.id));
    let logout!: Promise<void>;
    act(() => { logout = result.current.logout(); });
    await act(async () => { await result.current.passwordLogin(otherAccount.email, "password"); });
    await act(async () => { response.resolve({ ok: true, status: 204 } as Response); await logout; });
    expect(result.current.user?.id).toBe(otherAccount.id);
    expect(api.token).toBe(otherSession.token);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse((SecureStore.setItemAsync as jest.Mock).mock.calls.at(-1)[1]);
    expect(persisted.token).toBe(otherSession.token);
  } finally { fetchMock.mockRestore(); }
});

test("an in-flight credential write finishes before the newer account is persisted", async () => {
  const firstWrite = deferred<void>();
  let saved: { token: string } | undefined;
  (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(async (_key, value) => {
    await firstWrite.promise; saved = JSON.parse(value);
  }).mockImplementation(async (_key, value) => { saved = JSON.parse(value); });
  (shred.signIn as jest.Mock).mockResolvedValueOnce(session).mockResolvedValueOnce(otherSession);
  const fetchMock = mockSessionAccounts();
  try {
    const { result } = mount();
    await waitFor(() => expect(result.current.ready).toBe(true));
    let older!: Promise<unknown>, newer!: Promise<void>;
    act(() => { older = result.current.passwordLogin(account.email, "password").catch(cause => cause); });
    await waitFor(() => expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1));
    await act(async () => { newer = result.current.passwordLogin(otherAccount.email, "password"); });
    await act(async () => { firstWrite.resolve(); await Promise.all([older, newer]); });
    expect(saved?.token).toBe(otherSession.token);
    expect(api.token).toBe(otherSession.token);
    expect(result.current.user?.id).toBe(otherAccount.id);
  } finally { fetchMock.mockRestore(); }
});

test("a stale provider proof cannot link into the newer account", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(session));
  const proof = deferred<{ provider: "apple"; identity_token: string }>();
  (providerProof as jest.Mock).mockImplementationOnce(() => proof.promise);
  (shred.signIn as jest.Mock).mockResolvedValue(otherSession);
  const { result } = mount();
  await waitFor(() => expect(result.current.user?.id).toBe(account.id));
  let linking!: Promise<unknown>;
  act(() => { linking = result.current.socialLogin("apple", true).catch(cause => cause); });
  await act(async () => { await result.current.passwordLogin(otherAccount.email, "password"); });
  let failure: unknown;
  await act(async () => { proof.resolve({ provider: "apple", identity_token: "proof" }); failure = await linking; });
  expect(failure).toEqual(expect.objectContaining({ message: "Your sign-in changed. Please try again." }));
  expect(shred.providerSignIn).not.toHaveBeenCalled();
  expect(result.current.user?.id).toBe(otherAccount.id);
  expect(api.token).toBe(otherSession.token);
});

test("same-account reauthentication establishes fresh proof and preserves linked-method provenance", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ ...session,
    reauthentication_method: "password", confirmed_methods: ["password", "apple"] }));
  const refreshed = { ...session, token: "reauthenticated-session" };
  (shred.signIn as jest.Mock).mockResolvedValue(refreshed);
  const { result } = mount();
  await waitFor(() => expect(result.current.user?.id).toBe(account.id));
  await act(async () => { await result.current.reauthenticate("password"); });
  expect(shred.signIn).toHaveBeenCalledWith(account.email, "password");
  expect(result.current.user?.id).toBe(account.id);
  expect(api.token).toBe(refreshed.token);
  expect(result.current.confirmedMethods).toEqual(["password", "apple"]);
  expect(result.current.reauthenticationMethod).toBe("password");
  expect(global.fetch).not.toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "DELETE" }));
});

test("logout deletes an in-flight old credential instead of allowing it to reappear", async () => {
  const firstWrite = deferred<void>();
  let saved: string | null = null;
  (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(async (_key, value) => {
    await firstWrite.promise; saved = value;
  });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async () => { saved = null; });
  (shred.signIn as jest.Mock).mockResolvedValue(session);
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  let login!: Promise<unknown>, logout!: Promise<void>;
  act(() => { login = result.current.passwordLogin(account.email, "password").catch(cause => cause); });
  await waitFor(() => expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1));
  act(() => { logout = result.current.logout(); });
  await act(async () => { firstWrite.resolve(); await Promise.all([login, logout]); });
  expect(saved).toBeNull();
  expect(result.current.user).toBeNull();
  expect(api.token).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
});

test("a pending keychain deletion completes before a newer login writes its credential", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(session));
  const deletion = deferred<void>();
  let saved: { token: string } | null = { token: session.token };
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementationOnce(async () => { await deletion.promise; saved = null; });
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (_key, value) => { saved = JSON.parse(value); });
  (shred.signIn as jest.Mock).mockResolvedValue(otherSession);
  const { result } = mount();
  await waitFor(() => expect(result.current.user?.id).toBe(account.id));
  let logout!: Promise<void>, login!: Promise<void>;
  act(() => { logout = result.current.logout(); });
  await waitFor(() => expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1));
  await act(async () => { login = result.current.passwordLogin(otherAccount.email, "password"); });
  await act(async () => { deletion.resolve(); await Promise.all([logout, login]); });
  expect(saved?.token).toBe(otherSession.token);
  expect(result.current.user?.id).toBe(otherAccount.id);
  expect(api.token).toBe(otherSession.token);
});

test("a failed credential write does not block a later successful login", async () => {
  (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error("Keychain unavailable"));
  (shred.signIn as jest.Mock).mockResolvedValueOnce(session).mockResolvedValueOnce(otherSession);
  const { result } = mount();
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => { await expect(result.current.passwordLogin(account.email, "password")).rejects.toThrow("Keychain unavailable"); });
  expect(api.token).toBeNull();
  await act(async () => { await result.current.passwordLogin(otherAccount.email, "password"); });
  expect(result.current.user?.id).toBe(otherAccount.id);
  expect(api.token).toBe(otherSession.token);
  expect(result.current.error).toBeNull();
});
