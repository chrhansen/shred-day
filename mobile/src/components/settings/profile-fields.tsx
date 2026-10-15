import { useState } from "react";
import { Pressable, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { BottomSheet, Button, Field, Icon, Text, colors } from "../ui";

export const months = Array.from({ length: 12 }, (_, index) => new Date(2000, index, 1).toLocaleDateString(undefined, { month: "long" }));
export function usernameError(value: string) {
  return value && !/^[A-Za-z0-9_]{3,20}$/.test(value) ? "Use 3–20 letters, numbers, or underscores." : undefined;
}
export function SeasonStartFields({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [month, day] = value.split("-").map(Number);
  const [selection, setSelection] = useState<{ kind: "month" | "day"; draft: number } | null>(null);
  const maxDay = new Date(2000, month, 0).getDate();
  const apply = () => {
    if (!selection) return;
    const nextMonth = selection.kind === "month" ? selection.draft : month;
    const nextDay = Math.min(selection.kind === "day" ? selection.draft : day, new Date(2000, nextMonth, 0).getDate());
    onChange(`${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`); setSelection(null);
  };
  const options = selection?.kind === "month" ? months : Array.from({ length: maxDay }, (_, index) => String(index + 1));
  return <View style={{ gap: 8 }}><Text variant="subhead">Season start date</Text>
    <View style={{ flexDirection: "row", gap: 12 }}>{(["month", "day"] as const).map(kind => <Pressable key={kind}
      accessibilityRole="button" accessibilityLabel={kind === "month" ? `Month, ${months[month - 1]}` : `Day, ${day}`}
      disabled={disabled} onPress={() => setSelection({ kind, draft: kind === "month" ? month : day })}
      style={{ minHeight: 50, flex: kind === "month" ? 1.6 : 1, borderWidth: 1, borderColor: colors.border,
        borderRadius: 10, flexDirection: "row", alignItems: "center", padding: 14, gap: 8 }}>
      <Text style={{ flex: 1 }}>{kind === "month" ? months[month - 1] : day}</Text><Icon name="chevrons-up-down" size={16} color={colors.textSecondary} />
    </Pressable>)}</View>
    <BottomSheet visible={Boolean(selection)} title={selection?.kind === "month" ? "Season start month" : "Season start day"}
      onClose={() => setSelection(null)} scroll={false} footer={<Button title="Done" onPress={apply} />}>
      <Picker accessibilityLabel={selection?.kind === "month" ? "Season start month" : "Season start day"}
        selectedValue={selection?.draft} onValueChange={draft => { if (selection) setSelection({ ...selection, draft: Number(draft) }); }}>
        {options.map((label, index) => <Picker.Item key={label} label={label} value={index + 1} />)}
      </Picker>
    </BottomSheet>
  </View>;
}
export function UsernameField({ value, onChange, error, disabled }: { value: string; onChange: (value: string) => void; error?: string; disabled?: boolean }) {
  return <Field label="Username" value={value} onChangeText={onChange} error={error} readOnly={disabled}
    autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="Your public username"
    helper="Usernames are public on shared days. Use 3–20 letters, numbers, or underscores."
    leading={<Text style={{ color: colors.textSecondary }}>@</Text>} />;
}
