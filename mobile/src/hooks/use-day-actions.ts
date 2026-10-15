import { useRef, useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { shred } from "../services/shred";
import { displayDate } from "../lib/dates";
import { useToast } from "../components/ui/toast";

export function showDayActions({ share, edit, remove }: { share: () => void; edit: () => void; remove: () => void }) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions({
      options: ["Cancel", "Share…", "Edit Day", "Delete Day"], cancelButtonIndex: 0, destructiveButtonIndex: 3,
    }, (index) => { if (index === 1) share(); if (index === 2) edit(); if (index === 3) remove(); });
  } else {
    Alert.alert("Day actions", undefined, [
      { text: "Share…", onPress: share }, { text: "Edit Day", onPress: edit },
      { text: "Delete Day", style: "destructive", onPress: remove }, { text: "Cancel", style: "cancel" },
    ]);
  }
}

export function useDayActions() {
  const client = useQueryClient();
  const toast = useToast();
  const locked = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const remove = (day: { id: string; date: string; resort: string; photos?: number }, onDeleted: () => void) => {
    const perform = async () => {
      if (locked.current) return;
      locked.current = true; setDeleting(true);
      try {
        await shred.deleteDay(day.id);
        client.removeQueries({ queryKey: ["day", day.id] });
        client.removeQueries({ queryKey: ["shared-day", day.id] });
        onDeleted(); toast("Day deleted");
        void Promise.all([client.invalidateQueries({ queryKey: ["days"] }),
          client.invalidateQueries({ queryKey: ["stats"] }), client.invalidateQueries({ queryKey: ["account"] })]);
      } catch {
        client.removeQueries({ queryKey: ["shared-day", day.id] });
        void Promise.all([client.invalidateQueries({ queryKey: ["day", day.id] }),
          client.invalidateQueries({ queryKey: ["days"] }), client.invalidateQueries({ queryKey: ["stats"] })]).catch(() => {});
        Alert.alert("Couldn't confirm deletion", "Check your connection and try again.", [
          { text: "Cancel", style: "cancel" }, { text: "Try Again", onPress: () => void perform() },
        ]);
      } finally { locked.current = false; setDeleting(false); }
    };
    Alert.alert("Delete this day?", `${day.resort} · ${displayDate(day.date)} and ${day.photos === undefined ? "its attached photos" : `its ${day.photos} photos`} will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void perform() },
    ]);
  };
  return { remove, deleting };
}
