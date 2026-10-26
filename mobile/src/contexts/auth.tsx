import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { api, ApiClient, ApiError } from "../lib/api";
import type { Account, Session } from "../lib/types";
import { shred } from "../services/shred";
import { providerProof } from "../lib/provider-login";
import { offline } from "../lib/offline";

const key = "shredday.mobile.session";
type Method = Session["authentication_method"];
type Identity = Pick<Account, "id" | "email" | "username" | "avatar_url" | "full_name">;
type StoredSession = Session & { identity?: Identity; reauthentication_method?: Method; confirmed_methods?: Method[] };
type Auth = {
  user: Account | null; session: StoredSession | null; ready: boolean; error: string | null;
  expired: boolean; expiredIdentity: Identity | null; resetExpired: () => void;
  emailConfirmationRequired: boolean;
  reauthenticationMethod: Method; confirmedMethods: Method[];
  deletionConfirmed: boolean; deletedOwner: string | null; markAccountDeleted: () => void; acknowledgeDeletion: () => void;
  retry: () => void; refresh: () => Promise<void>;
  passwordLogin: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string) => Promise<void>;
  socialLogin: (provider: "apple" | "google", link?: boolean) => Promise<void>;
  reauthenticate: (password?: string) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
const identityOf = (account: Account): Identity => ({ id: account.id, email: account.email,
  username: account.username, avatar_url: account.avatar_url, full_name: account.full_name });
const persist = (stored: StoredSession) => SecureStore.setItemAsync(key, JSON.stringify(stored), {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});
const sessionClient = (token: string) => {
  const client = new ApiClient(api.baseUrl); client.token = token; return client;
};
const revoke = (token: string) => sessionClient(token).request<void>("/api/v1/mobile/sessions", { method: "DELETE" }).catch(() => {});
const changedSignIn = () => new Error("Your sign-in changed. Please try again.");

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Account | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [expiredIdentity, setExpiredIdentity] = useState<Identity | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const [deletedOwner, setDeletedOwner] = useState<string | null>(null);
  const generation = useRef(0);
  const credentialOperations = useRef<Promise<void>>(Promise.resolve());
  const userRef = useRef<Account | null>(null);
  const sessionRef = useRef<StoredSession | null>(null);
  const remember = useCallback((account: Account) => { userRef.current = account; setUser(account); }, []);
  const rememberSession = useCallback((stored: StoredSession | null) => { sessionRef.current = stored; setSession(stored); }, []);
  const resetExpired = useCallback(() => { setExpired(false); setExpiredIdentity(null); setEmailConfirmationRequired(false); }, []);
  const saveCredential = useCallback((current: number, stored: StoredSession | null) => {
    const operation = credentialOperations.current.then(async () => {
      if (stored && current !== generation.current) return;
      if (stored) await persist(stored); else await SecureStore.deleteItemAsync(key);
    });
    credentialOperations.current = operation.then(() => {}, () => {});
    return operation;
  }, []);
  const clear = useCallback(async (didExpire = false, identity?: Identity, expectedGeneration?: number, confirmationRequired = false) => {
    if (expectedGeneration !== undefined && expectedGeneration !== generation.current) return;
    const previous = identity || (userRef.current ? identityOf(userRef.current) : sessionRef.current?.identity);
    const current = ++generation.current;
    api.token = null; userRef.current = null;
    offline.detach();
    setUser(null); rememberSession(null); setError(null);
    setExpired(didExpire); setExpiredIdentity(didExpire ? previous || null : null);
    setEmailConfirmationRequired(confirmationRequired);
    queryClient.clear(); setReady(true);
    await saveCredential(current, null);
  }, [queryClient, rememberSession, saveCredential]);
  const refresh = useCallback(async () => {
    const current = generation.current;
    const account = await shred.account();
    if (current !== generation.current) return;
    const local = await offline.rememberAccount(account);
    if (current !== generation.current) return;
    remember(local || account);
    const stored = sessionRef.current;
    if (stored) { const next = { ...stored, identity: identityOf(account) }; rememberSession(next); await saveCredential(current, next); }
  }, [remember, rememberSession, saveCredential]);
  const restore = useCallback(async () => {
    const current = ++generation.current;
    try {
      await credentialOperations.current;
      if (generation.current !== current) return;
      const saved = await SecureStore.getItemAsync(key);
      if (generation.current !== current || !saved) return;
      let stored: StoredSession;
      try { stored = JSON.parse(saved); } catch { await clear(false, undefined, current); return; }
      if (!stored?.token || !(Date.parse(stored.expires_at) > Date.now())) {
        await clear(Boolean(stored?.token), stored?.identity, current); return;
      }
      api.token = stored.token; rememberSession(stored);
      if (stored.identity?.id) {
        const cached = await offline.activate(stored.identity.id, queryClient);
        if (generation.current !== current) return;
        if (cached) { remember(cached); setReady(true); }
      }
      const account = await shred.account();
      if (generation.current === current) {
        if (!stored.identity?.id) await offline.activate(account.id, queryClient);
        if (generation.current !== current) return;
        const local = await offline.rememberAccount(account);
        if (generation.current === current) remember(local || account);
      }
    } catch (cause) {
      if (generation.current !== current) return;
      if (cause instanceof ApiError && cause.status === 401) await clear(true, undefined, current, cause.code === "email_confirmation_required");
      else if (!userRef.current) setError("Could not reach Shred.Day. Check your connection and try again.");
    } finally { if (current === generation.current) setReady(true); }
  }, [clear, remember, rememberSession, queryClient]);
  useEffect(() => {
    api.onUnauthorized = code => {
      const clearedGeneration = generation.current + 1;
      void clear(true, undefined, undefined, code === "email_confirmation_required")
        .catch(() => { if (generation.current === clearedGeneration) setError("Please sign in again."); });
    };
    void Promise.resolve().then(restore);
    return () => { api.onUnauthorized = undefined; };
  }, [clear, restore]);
  const establish = async (next: StoredSession, current: number, knownAccount?: Account) => {
    let accountLoaded = false;
    try {
      if (current !== generation.current) throw changedSignIn();
      const account = knownAccount || await sessionClient(next.token).request<Account>("/api/v1/account");
      accountLoaded = true;
      if (current !== generation.current) throw changedSignIn();
      const stored = { ...next, identity: identityOf(account),
        confirmed_methods: next.confirmed_methods || [next.authentication_method] };
      await saveCredential(current, stored);
      if (current !== generation.current) throw changedSignIn();
      api.token = next.token;
      queryClient.clear();
      await offline.activate(account.id, queryClient);
      if (current !== generation.current) throw changedSignIn();
      const local = await offline.rememberAccount(account);
      if (current !== generation.current) throw changedSignIn();
      rememberSession(stored); remember(local || account); setError(null); resetExpired();
    } catch (cause) {
      if (current !== generation.current) { await revoke(next.token); throw changedSignIn(); }
      if (!accountLoaded && !userRef.current && !(cause instanceof ApiError && cause.status === 401)) {
        await saveCredential(current, next);
        if (current !== generation.current) { await revoke(next.token); throw changedSignIn(); }
        api.token = next.token; rememberSession(next);
      } else await revoke(next.token);
      if (current !== generation.current) throw changedSignIn();
      setError("Could not load your account. Check your connection and reconnect.");
      throw cause;
    }
  };
  const registerEmail = async (email: string) => {
    const current = ++generation.current;
    await shred.signUp(email);
    if (current !== generation.current) throw changedSignIn();
  };
  const passwordLogin = async (email: string, password: string) => {
    const current = ++generation.current;
    const next = await shred.signIn(email, password);
    await establish(next, current);
  };
  const socialLogin = async (provider: "apple" | "google", link = false) => {
    const previous = sessionRef.current;
    if (link && (!previous || !userRef.current)) throw new Error("Please sign in again.");
    const current = ++generation.current;
    const proof = await providerProof(provider);
    if (current !== generation.current) throw changedSignIn();
    const next = await shred.providerSignIn(proof, link);
    await establish(link && previous ? { ...next,
      reauthentication_method: previous.reauthentication_method || previous.authentication_method,
      confirmed_methods: Array.from(new Set([...(previous.confirmed_methods || [previous.authentication_method]), provider])),
    } : next, current);
  };
  const reauthenticate = async (password?: string) => {
    const expected = userRef.current;
    const previous = sessionRef.current;
    if (!expected || !previous) throw new Error("Please sign in again.");
    const current = ++generation.current;
    const method = previous.reauthentication_method || previous.authentication_method;
    let next: Session;
    if (method === "password") next = await shred.signIn(expected.email, password || "");
    else {
      const proof = await providerProof(method);
      if (current !== generation.current) throw changedSignIn();
      next = await shred.providerSignIn(proof, false);
    }
    const verification = sessionClient(next.token);
    let account: Account;
    try {
      if (current !== generation.current) throw changedSignIn();
      account = await verification.request<Account>("/api/v1/account");
      if (account.id !== expected.id) throw new Error("Use the sign-in connected to this account.");
      if (current !== generation.current) throw changedSignIn();
    } catch (cause) {
      await revoke(next.token);
      throw cause;
    }
    await establish({ ...next, confirmed_methods: previous.confirmed_methods,
      reauthentication_method: method }, current, account);
  };
  const logout = useCallback(async () => {
    const current = ++generation.current;
    const token = api.token;
    await Promise.all([clear(false, undefined, current), token ? revoke(token) : Promise.resolve()]);
  }, [clear]);
  return <Context.Provider value={{ user, session, ready, error, expired, expiredIdentity, resetExpired, emailConfirmationRequired,
    deletionConfirmed, deletedOwner,
    markAccountDeleted: () => { setDeletedOwner(user?.id || session?.identity?.id || null); setDeletionConfirmed(true); },
    acknowledgeDeletion: () => { setDeletedOwner(null); setDeletionConfirmed(false); },
    reauthenticationMethod: session?.reauthentication_method || session?.authentication_method || "password",
    confirmedMethods: session?.confirmed_methods || (session ? [session.authentication_method] : []),
    retry: () => { setReady(false); setError(null); void restore(); }, refresh, passwordLogin, registerEmail, socialLogin, reauthenticate, logout }}>
    {children}
  </Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider required");
  return value;
}
