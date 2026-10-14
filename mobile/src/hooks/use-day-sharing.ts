import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/auth";
import { shred } from "../services/shred";
import type { Day } from "../lib/types";
import { useToast } from "../components/ui/toast";

export function useDaySharing(id: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();
  const locked = useRef(false);
  const desired = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const update = async (enabled: boolean) => {
    if (locked.current) return;
    locked.current = true; desired.current = enabled; setBusy(true); setFailed(false);
    try {
      const result = await (enabled ? shred.shareDay(id) : shred.unshareDay(id));
      client.setQueryData<Day>(["day", id, user?.id], (current) => current
        ? { ...current, shared_at: result.shared_at } : current);
      client.removeQueries({ queryKey: ["shared-day", id] });
      void client.invalidateQueries({ queryKey: ["day", id, user?.id] });
      if (!enabled) toast("Sharing stopped");
    } catch {
      setFailed(true);
      client.removeQueries({ queryKey: ["shared-day", id] });
      void client.invalidateQueries({ queryKey: ["day", id, user?.id] });
    } finally { locked.current = false; setBusy(false); }
  };
  return { busy, failed, update, retry: () => update(desired.current) };
}
