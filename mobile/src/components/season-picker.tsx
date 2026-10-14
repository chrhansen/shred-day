import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/auth";
import { seasonLabel } from "../lib/dates";
import { seasonDateRange } from "../lib/seasons";
import { colors, Text, Icon } from "./ui";
import { BottomSheet } from "./ui/sheet";

export { SeasonProvider, useSeason } from "../contexts/season";
export { seasonDateRange } from "../lib/seasons";
const titleForSeason = (offset: number) => {
  const label = seasonLabel(offset);
  return label.replace("season", "Season").replace(/^\w/, (letter) => letter.toUpperCase());
};
export function SeasonPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const cutoff = user?.season_start_day || "09-01";
  const range = seasonDateRange(value, cutoff).label;
  const seasons = Array.from(new Set([0, ...(user?.available_seasons || []), value])).sort((a, b) => b - a);
  const cutoffLabel = new Date(2000, Number(cutoff.slice(0, 2)) - 1, Number(cutoff.slice(3)))
    .toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${titleForSeason(value)}, ${range}. Change season`}
      accessibilityState={{ expanded: open }} onPress={() => setOpen(true)}
      style={({ pressed }) => [{ minHeight: 44, justifyContent: "center", gap: 1, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text variant="header" style={{ flexShrink: 1 }}>{titleForSeason(value)}</Text>
        <Icon name="chevron-down" size={18} color={colors.textSecondary} strokeWidth={2.25} />
      </View>
      <Text variant="caption" style={{ color: colors.textSecondary }}>{range}</Text>
    </Pressable>
    <BottomSheet visible={open} onClose={() => setOpen(false)} title="Season" height="medium" centerTitle
      contentStyle={{ paddingHorizontal: 0 }}>
      {seasons.map((offset) => {
        const days = client.getQueryData<unknown[]>(["days", offset, user?.id]);
        const stats = client.getQueryData<{ summary: { totalDays: number } }>(["stats", offset, user?.id]);
        const count = days?.length ?? stats?.summary.totalDays;
        return <Pressable key={offset} accessibilityRole="radio" accessibilityState={{ checked: offset === value }}
          onPress={() => { onChange(offset); setOpen(false); }}
          accessibilityLabel={`${titleForSeason(offset)}, ${seasonDateRange(offset, cutoff).label}${count === undefined ? "" : `, ${count} days`}`}
          style={({ pressed }) => [{ paddingHorizontal: 20, paddingVertical: 14, minHeight: 64,
            flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1,
            borderTopColor: colors.divider, backgroundColor: pressed ? colors.fill : colors.canvas }]}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="headline">{titleForSeason(offset)}</Text>
            <Text variant="footnote" style={{ color: colors.textSecondary }}>{seasonDateRange(offset, cutoff).label}</Text>
          </View>
          {count !== undefined && <Text variant="subhead" style={{ color: colors.textSecondary }}>
            {count ? `${count} ${count === 1 ? "day" : "days"}` : "No days"}
          </Text>}
          {offset === value && <Icon name="check" size={20} color={colors.primary} strokeWidth={2.25} />}
        </Pressable>;
      })}
      <Text variant="caption" style={{ paddingHorizontal: 20, color: colors.textSecondary }}>
        Seasons start on {cutoffLabel}. You can change this in Settings › Profile.
      </Text>
    </BottomSheet>
  </>;
}
export function SeasonHeader({ value, onChange, right }: { value: number;
  onChange: (value: number) => void; right?: ReactNode;
}) {
  return <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: colors.canvas }}>
    <View style={{ minHeight: 62, paddingVertical: 7, paddingHorizontal: 16, flexDirection: "row",
      alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flex: 1 }}><SeasonPicker value={value} onChange={onChange} /></View>{right}
    </View>
  </SafeAreaView>;
}
