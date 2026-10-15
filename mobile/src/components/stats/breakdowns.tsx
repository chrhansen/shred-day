import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import type { SeasonStats } from "../../lib/types";
import { tagSegments } from "../../lib/season-charts";
import { colors, fonts, radius } from "../../theme";
import { Text } from "../ui";
import { StatCard } from "./stat-card";

export function TopResorts({ resorts }: { resorts: SeasonStats["resorts"] }) {
  const top = [...resorts].sort((a, b) => b.daysSkied - a.daysSkied).slice(0, 5);
  const maximum = Math.max(1, ...top.map((resort) => resort.daysSkied));
  return <StatCard title="Top resorts" icon="mountain">
    {top.map((resort, index) => <View key={`${resort.name}-${index}`} accessible
      accessibilityLabel={`${index + 1}. ${resort.name}, ${resort.daysSkied} ${resort.daysSkied === 1 ? "day" : "days"}`}
      style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <Text variant="chip" style={{ color: colors.indigo, fontFamily: fonts.bold, width: 16 }}>{index + 1}</Text>
      <View style={{ flex: 1, gap: 7 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Text variant="chip" style={{ flex: 1 }}>{resort.name}</Text>
          <Text variant="subhead" style={{ color: colors.textSecondary }}>{resort.daysSkied}d</Text>
        </View>
        <View style={{ height: 6, backgroundColor: colors.fill, borderRadius: 3 }}>
          <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ height: 6, borderRadius: 3, width: `${resort.daysSkied / maximum * 100}%` }} />
        </View>
      </View>
    </View>)}
  </StatCard>;
}
export function TagDonut({ tags }: { tags: SeasonStats["tags"] }) {
  const slices = tagSegments(tags);
  const [selected, setSelected] = useState<string | null>(null);
  const { fontScale } = useWindowDimensions();
  const active = slices.find((tag) => tag.name === selected);
  const circumference = 2 * Math.PI * 61;
  const summary = active ? `${active.percentage}% · ${active.name}` : `${slices.length} tags`;
  return <StatCard title="Top tags" icon="tags">
    {!slices.length ? <Text variant="footnote" style={{ color: colors.textSecondary }}>No tags used yet</Text>
      : <View style={{ flexDirection: fontScale > 1.4 ? "column" : "row", alignItems: "center", gap: 16 }}>
        <View accessible accessibilityLabel={"Tag breakdown. " + slices.map((tag) => `${tag.name}, ${tag.count} days, ${tag.percentage}%`).join(". ")}
          style={{ width: 148, height: 148, alignItems: "center", justifyContent: "center" }}>
          <Svg width={148} height={148} accessible={false} style={{ position: "absolute", inset: 0 }}>
            {slices.map((tag) => {
              const gap = slices.length === 1 ? 0 : Math.min(circumference / 300, tag.fraction * circumference * 0.15);
              return <Circle key={tag.name} cx={74} cy={74} r={61} fill="none" stroke={tag.color} strokeWidth={26}
                strokeDasharray={`${Math.max(0, tag.fraction * circumference - gap)} ${circumference}`}
                strokeDashoffset={-tag.start * circumference} rotation={-90} origin="74,74"
                opacity={active && active.name !== tag.name ? 0.22 : 1} />;
            })}
          </Svg>
          {fontScale <= 1.4 && <View accessible={false} style={{ maxWidth: 92, alignItems: "center" }}>
            <Text variant="header">{active ? `${active.percentage}%` : slices.length}</Text>
            <Text variant="small" style={{ color: colors.textSecondary, textAlign: "center" }}>{active?.name ?? "tags"}</Text>
          </View>}
        </View>
        {fontScale > 1.4 && <Text variant="headline">{summary}</Text>}
        <View style={{ flex: fontScale > 1.4 ? undefined : 1, width: fontScale > 1.4 ? "100%" : undefined }}>
          {slices.map((tag) => <Pressable key={tag.name} accessibilityRole="button"
            accessibilityLabel={`${tag.name}, ${tag.count} ${tag.count === 1 ? "day" : "days"}, ${tag.percentage}%`}
            accessibilityState={{ selected: active?.name === tag.name }}
            onPress={() => setSelected(active?.name === tag.name ? null : tag.name)}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", minHeight: 44,
              paddingVertical: 8, paddingHorizontal: 8, gap: 8, borderRadius: radius.m,
              backgroundColor: active?.name === tag.name ? colors.accentFill : "transparent", opacity: pressed ? 0.7 : 1 }]}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: tag.color }} />
            <Text variant="chip" style={{ flex: 1, fontFamily: active?.name === tag.name ? fonts.bold : fonts.medium }}>{tag.name}</Text>
            <Text variant="chip" style={{ color: colors.textSecondary }}>{tag.percentage}%</Text>
          </Pressable>)}
        </View>
      </View>}
  </StatCard>;
}
export function SkiUsage({ skis }: { skis: SeasonStats["skis"] }) {
  const total = skis.reduce((sum, ski) => sum + ski.days, 0);
  return <StatCard title="Skis used" icon="ski">
    {!total ? <Text variant="footnote" style={{ color: colors.textSecondary }}>No skis logged yet</Text> : <>
      <View accessible accessibilityLabel={"Ski usage. " + skis.map((ski) => `${ski.name}, ${ski.days} days`).join(". ")}
        style={{ height: 14, flexDirection: "row", gap: 2, borderRadius: 7, overflow: "hidden" }}>
        {skis.map((ski, index) => <View key={ski.name} style={{ flex: ski.days,
          backgroundColor: colors.ski[index % colors.ski.length] }} />)}
      </View>
      {skis.map((ski, index) => <View key={ski.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ski[index % colors.ski.length] }} />
        <Text variant="chip" style={{ flex: 1 }}>{ski.name}</Text>
        <Text variant="chip" style={{ color: colors.textSecondary }}>{ski.days} {ski.days === 1 ? "day" : "days"}</Text>
      </View>)}
    </>}
  </StatCard>;
}
