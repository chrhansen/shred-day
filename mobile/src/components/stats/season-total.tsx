import { View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { SeasonStats } from "../../lib/types";
import { colors, radius, shadow } from "../../theme";
import { Icon, Text } from "../ui";

export function SeasonTotal({ summary }: { summary: SeasonStats["summary"] }) {
  const { fontScale } = useWindowDimensions();
  return <View style={[shadow.seasonCard, { borderRadius: radius.xl }]}>
    <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }}
      style={{ borderRadius: radius.xl, paddingVertical: 18, paddingHorizontal: 20,
        flexDirection: fontScale > 1.5 ? "column" : "row", alignItems: fontScale > 1.5 ? "flex-start" : "center",
        justifyContent: "space-between", gap: 16 }}>
      <View><Text variant="statHero" style={{ color: colors.canvas }}>{summary.totalDays}</Text>
        <Text variant="callout" style={{ color: colors.canvas, opacity: 0.9 }}>days this season</Text>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          <Icon name="arrow-up-right" size={15} color={colors.canvas} />
          <Text variant="subhead" style={{ color: colors.canvas }}>{summary.uniqueResorts} {summary.uniqueResorts === 1 ? "resort" : "resorts"}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          <Icon name="flame" size={15} color={colors.canvas} />
          <Text variant="subhead" style={{ color: colors.canvas }}>{summary.longestStreak}-day longest streak</Text>
        </View>
      </View>
    </LinearGradient>
  </View>;
}
