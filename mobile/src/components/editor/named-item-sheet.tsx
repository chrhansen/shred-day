import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth";
import { shred } from "../../services/shred";
import type { Tag } from "../../lib/types";
import { Field, Notice, Text } from "../ui";
import { colors } from "../../theme";
import { BottomSheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

type NamedItemSheetProps = {
  kind: "skis" | "tags"; visible: boolean; onClose: () => void;
  onCreated: (item: Tag) => void;
};
export function NamedItemSheet(props: NamedItemSheetProps) {
  return props.visible ? <NamedItemSheetContent {...props} /> : null;
}
function NamedItemSheetContent({ kind, visible, onClose, onCreated }: NamedItemSheetProps) {
  const { user } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitting = useRef(false);
  const add = async () => {
    if (!name.trim() || submitting.current) return;
    submitting.current = true;
    setBusy(true); setFailed(false);
    try {
      const item = await shred.createNamed(kind, name.trim());
      client.setQueryData<Tag[]>([kind, user?.id], (current = []) =>
        current.some((value) => value.id === item.id) ? current : [...current, item]);
      onCreated(item); onClose(); toast(`${item.name} added`);
      void client.invalidateQueries({ queryKey: [kind, user?.id] }).catch(() => {});
    } catch { setFailed(true); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <BottomSheet visible={visible} dismissible={!busy} cancelLabel="Cancel" onClose={onClose} title={kind === "skis" ? "New ski" : "New tag"}
    headerRight={<Pressable accessibilityRole="button" accessibilityLabel={kind === "skis" ? "Add ski" : "Add tag"}
      accessibilityState={{ disabled: !name.trim() || busy, busy }} disabled={!name.trim() || busy} onPress={() => void add()}
      style={{ minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }}>
      {busy ? <ActivityIndicator color={colors.primary} /> : <Text variant="navAction" style={{ color: colors.primary, opacity: name.trim() ? 1 : 0.4 }}>Add</Text>}
    </Pressable>}>
    <View style={{ gap: 20 }}>
      <Field label={kind === "skis" ? "Ski name" : "Tag name"} hideLabel value={name} onChangeText={setName}
        placeholder={kind === "skis" ? "e.g. Völkl Racetiger SL" : "e.g. Spring snow, Kids"}
        autoFocus editable={!busy} maxLength={kind === "tags" ? 40 : 100} returnKeyType="done"
        onSubmitEditing={() => void add()} />
      <Text variant="footnote" style={{ color: colors.textSecondary }}>
        {kind === "skis" ? "Your ski list is shared across all your days. It's selected for this day."
          : "Tags can describe conditions or who you skied with. It's selected for this day."}
      </Text>
      {failed && <Notice error={new Error(`Couldn't add this ${kind === "skis" ? "ski" : "tag"}. Check the name and try again.`)} />}
    </View>
  </BottomSheet>;
}
