import { useEffect, type ReactNode } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import { useQueryClient } from "@tanstack/react-query";
import { offline } from "../lib/offline";
import { useAuth } from "./auth";

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, session, refresh } = useAuth();
  const client = useQueryClient();
  const owner = user?.id, token = session?.token;
  useEffect(() => {
    if (!owner || !token) return;
    let disposed = false, busy = false, requested = false, failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      if (disposed || busy || AppState.currentState !== "active") return;
      busy = true; requested = false; clearTimeout(timer);
      try {
        await offline.sync();
        if (disposed) return;
        if (offline.status().offline) return;
        failures = 0;
        await Promise.all([client.invalidateQueries({ queryKey: ["days"] }),
          client.invalidateQueries({ queryKey: ["stats"] }), refresh().catch(() => {})]);
      } catch { failures++; }
      finally {
        busy = false;
        if (!disposed) timer = setTimeout(() => void run(), failures ? Math.min(300_000, 5_000 * 2 ** (failures - 1)) : requested ? 0 : 60_000);
      }
    };
    const wake = () => { if (busy) requested = true; else void run(); };
    offline.setWake(wake);
    const network = Network.addNetworkStateListener((state) => {
      offline.setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    void Network.getNetworkStateAsync().then((state) => {
      if (!disposed) offline.setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    }).catch(wake);
    const app = AppState.addEventListener("change", (state) => { if (state === "active") wake(); });
    wake();
    return () => { disposed = true; clearTimeout(timer); network.remove(); app.remove(); offline.setWake(undefined); };
  }, [owner, token, client, refresh]);
  return children;
}
