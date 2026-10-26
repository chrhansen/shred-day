import { useState, useSyncExternalStore } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { offline } from "../lib/offline";
import type { Day } from "../lib/types";
import { Button, Notice, Text, colors } from "./ui";

export function SyncNotice({ day }: { day?: Day }) {
  const status = useSyncExternalStore(offline.subscribe, offline.status, offline.status);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const resolve = async (keep: boolean) => {
    if (!day || busy) return;
    setBusy(true); setFailed(false);
    try { await offline.resolve(day.id, keep); if (!keep) router.dismissTo("/"); } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  if (day?.sync_state === "failed") return <View style={{ gap: 10 }}>
    <Notice message={day.sync_error || "This day needs attention before it can sync."} />
    <Button title="Retry My Version" variant="compact" busy={busy} onPress={() => Alert.alert("Keep your version?",
      "Your saved version will replace the server's version of this day.", [
        { text: "Cancel", style: "cancel" }, { text: "Keep My Version", onPress: () => void resolve(true) },
      ])} />
    <Button title="Discard Local Changes" variant="text" disabled={busy} onPress={() => Alert.alert("Discard local changes?",
      "Your unsynced changes will be removed. The server's version will be restored when available.", [
        { text: "Cancel", style: "cancel" }, { text: "Discard Changes", style: "destructive", onPress: () => void resolve(false) },
      ])} />
    {failed && <Notice message="Couldn't update the local journal. Please try again." />}
  </View>;
  const message = day?.sync_state ? "Saved on device · waiting to sync" : status.failed
    ? `${status.failed} ${status.failed === 1 ? "day needs" : "days need"} attention. Open the marked entries to review.`
    : status.pending ? `${status.pending} ${status.pending === 1 ? "change" : "changes"} saved on device · ${status.syncing ? "syncing…" : "waiting to sync"}`
    : status.offline ? "Offline · showing days saved on this device" : null;
  return message ? <Text accessibilityLiveRegion="polite" variant="footnote" style={{ color: colors.textSecondary }}>{message}</Text> : null;
}
