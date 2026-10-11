import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { api, ApiError } from "../lib/api";
import type { Account, Session } from "../lib/types";
import { shred } from "../services/shred";
import { providerProof } from "../lib/provider-login";
const key = "shredday.mobile.session";
type Auth = {
  user: Account | null;
  session: Session | null;
  ready: boolean;
  error: string | null;
  retry: () => void;
  refresh: () => Promise<void>;
  passwordLogin: (
    email: string,
    password: string,
    register?: boolean,
  ) => Promise<void>;
  socialLogin: (provider: "apple" | "google", link?: boolean) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Account | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const clear = useCallback(async () => {
    generation.current++;
    api.token = null;
    setUser(null);
    setSession(null);
    setError(null);
    queryClient.clear();
    await SecureStore.deleteItemAsync(key);
  }, [queryClient]);
  const refresh = useCallback(async () => {
    const current = generation.current;
    const account = await shred.account();
    if (current === generation.current) setUser(account);
  }, []);
  const restore = useCallback(async () => {
    const current = ++generation.current;
    try {
      const saved = await SecureStore.getItemAsync(key);
      if (generation.current !== current || !saved) return;
      let stored: Session;
      try {
        stored = JSON.parse(saved);
      } catch {
        await clear();
        return;
      }
      if (!stored.token || !(Date.parse(stored.expires_at) > Date.now())) {
        await clear();
        return;
      }
      api.token = stored.token;
      setSession(stored);
      const account = await shred.account();
      if (generation.current === current) setUser(account);
    } catch (cause) {
      if (generation.current !== current) return;
      if (cause instanceof ApiError && cause.status === 401) await clear();
      else setError((cause as Error).message);
    } finally {
      setReady(true);
    }
  }, [clear]);
  useEffect(() => {
    api.onUnauthorized = () => {
      void clear();
    };
    void Promise.resolve().then(restore);
    return () => {
      api.onUnauthorized = undefined;
    };
  }, [clear, restore]);
  const establish = async (next: Session) => {
    generation.current++;
    api.token = next.token;
    setSession(next);
    await SecureStore.setItemAsync(key, JSON.stringify(next), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    queryClient.clear();
    try {
      await refresh();
      setError(null);
    } catch (cause) {
      setError((cause as Error).message);
      throw cause;
    }
  };
  const passwordLogin = async (
    email: string,
    password: string,
    register = false,
  ) =>
    establish(
      await (register
        ? shred.signUp(email, password)
        : shred.signIn(email, password)),
    );
  const socialLogin = async (provider: "apple" | "google", link = false) =>
    establish(await shred.providerSignIn(await providerProof(provider), link));
  const logout = async () => {
    try {
      await shred.signOut();
    } catch {
      /* The local credential is always removed, including after account deletion. */
    } finally {
      await clear();
    }
  };
  return (
    <Context.Provider
      value={{
        user,
        session,
        ready,
        error,
        retry: () => {
          setReady(false);
          setError(null);
          void restore();
        },
        refresh,
        passwordLogin,
        socialLogin,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider required");
  return value;
}
