import { useState } from "react";
import { View } from "react-native";
import { Icon, Text, colors } from "../ui";
import { radius } from "../../theme";
import type { StatsResort } from "../../lib/season-charts";
import { ResortMap } from "./resort-map";
import { StatCard } from "./stat-card";

export function ResortMapCard({ resorts }: { resorts: readonly StatsResort[] }) {
  const [selection, setSelection] = useState<string | null>(null);
  const selected = Math.max(0, resorts.findIndex((resort) => resortKey(resort) === selection));
  const resort = resorts[selected];
  return <StatCard title="Where you've been" icon="pin">
    <ResortMap resorts={resorts} selected={selected} onSelect={(index) => {
      if (resorts[index]) setSelection(resortKey(resorts[index]));
    }} />
    {resort && <View accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: radius.l,
      backgroundColor: colors.surfaceSubtle, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Icon name="mountain" size={18} color={colors.indigo} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="chip" style={{ fontFamily: "SpaceGrotesk_700Bold" }}>{resort.name}</Text>
        {resort.country && <Text variant="caption" style={{ color: colors.textSecondary }}>{resort.country}</Text>}
      </View>
      <Text variant="chip" style={{ fontFamily: "SpaceGrotesk_700Bold" }}>{resort.daysSkied} {resort.daysSkied === 1 ? "day" : "days"}</Text>
    </View>}
  </StatCard>;
}
const resortKey = (resort: StatsResort) => JSON.stringify([resort.name, resort.country, resort.latitude, resort.longitude]);
