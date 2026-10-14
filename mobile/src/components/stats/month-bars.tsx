import { useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { busiestMonth, monthBarHeight, type MonthPoint } from "../../lib/season-charts";
import { colors, fonts } from "../../theme";
import { BottomSheet, Icon, Text } from "../ui";
import { StatCard } from "./stat-card";

export function MonthBars({ months }: { months: readonly MonthPoint[] }) {
  const [selected, setSelected] = useState(() => busiestMonth(months));
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(290);
  const { fontScale } = useWindowDimensions();
  const active = months[selected];
  const maximum = Math.max(1, ...months.map((month) => month.days));
  return <StatCard title="Days per month" right={<Pressable accessibilityRole="button"
    accessibilityLabel={`${active.name}, ${active.days} days. Choose month`} onPress={() => setOpen(true)}
    style={{ minHeight: 44, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 4 }}>
    <Text variant="subhead" accessibilityLiveRegion="polite" style={{ color: colors.indigo }}>
      {active.name} · {active.days} {active.days === 1 ? "day" : "days"}
    </Text><Icon name="chevron-down" size={12} color={colors.indigo} />
  </Pressable>}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <Pressable onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onPress={(event) => setSelected(Math.max(0, Math.min(months.length - 1,
          Math.floor(event.nativeEvent.locationX / width * months.length))))}
        accessibilityRole="adjustable" accessibilityLabel={"Days per month. " + months.map((month) => `${month.name} ${month.days}`).join(", ")}
        accessibilityHint="Swipe up or down to change month, or use Choose month."
        accessibilityValue={{ min: 1, max: months.length, now: selected + 1, text: `${active.name}, ${active.days} days` }}
        accessibilityActions={[{ name: "increment", label: "Next month" }, { name: "decrement", label: "Previous month" }]}
        onAccessibilityAction={(event) => setSelected((value) => Math.max(0,
          Math.min(months.length - 1, value + (event.nativeEvent.actionName === "increment" ? 1 : -1))))}
        style={{ flex: 1, minHeight: 178, minWidth: Math.max(290, 12 * 16 * fontScale), paddingTop: 14 }}>
        <View pointerEvents="none" style={{ flexDirection: "row", gap: 5 }}>
          {months.map((month, index) => <View key={month.key} style={{ flex: 1 }}>
            <View style={{ height: 144, justifyContent: "flex-end", gap: 2 }}>
              {index === selected && month.days > 0 && <Text variant="small" style={{ textAlign: "center", fontFamily: fonts.bold }}>{month.days}</Text>}
              {index === selected && month.days > 0 ? <LinearGradient colors={[colors.indigo, colors.primary]}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ height: monthBarHeight(month.days, maximum),
                  borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
                : <View style={{ height: monthBarHeight(month.days, maximum), backgroundColor: month.days ? colors.barInactive : colors.barZero,
                  borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />}
            </View>
            <Text variant="small" style={{ textAlign: "center", marginTop: 10, color: index === selected ? colors.ink : colors.textMuted,
              fontFamily: index === selected ? fonts.bold : fonts.medium }}>{month.label}</Text>
          </View>)}
        </View>
      </Pressable>
    </ScrollView>
    <BottomSheet title="Month" visible={open} onClose={() => setOpen(false)} centerTitle height="medium">
      {months.map((month, index) => <Pressable key={month.key} accessibilityRole="radio"
        accessibilityLabel={`${month.name}, ${month.days} days`} accessibilityState={{ checked: index === selected }}
        onPress={() => { setSelected(index); setOpen(false); }}
        style={({ pressed }) => [{ minHeight: 52, paddingVertical: 14, flexDirection: "row", gap: 12,
          borderBottomWidth: 1, borderBottomColor: colors.divider, alignItems: "center", opacity: pressed ? 0.7 : 1 }]}>
        <Text variant="bodyMedium" style={{ flex: 1 }}>{month.name}</Text>
        <Text variant="subhead" style={{ color: colors.textSecondary }}>{month.days} {month.days === 1 ? "day" : "days"}</Text>
        {index === selected && <Icon name="check" color={colors.primary} />}
      </Pressable>)}
    </BottomSheet>
  </StatCard>;
}
