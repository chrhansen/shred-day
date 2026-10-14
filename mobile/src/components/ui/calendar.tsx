import { PanResponder, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { colors, fonts } from "../../theme";
import { dateString, parseDay } from "../../lib/dates";
import { IconButton } from "./buttons";
import { Text } from "./text";

export function Calendar({ month, selected, loggedDates = [], onMonthChange, onSelect,
  weekStartsOn = 0, legend = true, helper }: {
  month: string; selected?: string; loggedDates?: ReadonlySet<string> | readonly string[];
  onMonthChange: (month: string) => void; onSelect: (date: string) => void;
  weekStartsOn?: number; legend?: boolean; helper?: string;
}) {
  const { fontScale } = useWindowDimensions();
  const first = parseDay(month);
  first.setDate(1);
  const year = first.getFullYear(), monthIndex = first.getMonth();
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const weekStart = ((weekStartsOn % 7) + 7) % 7;
  const blanks = (first.getDay() - weekStart + 7) % 7;
  const dates = new Set(loggedDates);
  const today = dateString(new Date());
  const changeMonth = (delta: number) => onMonthChange(dateString(new Date(year, monthIndex + delta, 1)));
  const gesture = PanResponder.create({
    onMoveShouldSetPanResponder: (_, state) => Math.abs(state.dx) > 30 && Math.abs(state.dx) > Math.abs(state.dy) * 2,
    onPanResponderRelease: (_, state) => {
      if (Math.abs(state.dx) > 40) onMonthChange(dateString(new Date(year, monthIndex + (state.dx > 0 ? -1 : 1), 1)));
    },
  });
  const days = Array.from({ length: 7 }, (_, index) => new Date(2023, 0, 1 + (index + weekStart) % 7));
  const cells = Array.from({ length: Math.ceil((blanks + count) / 7) * 7 }, (_, index) => index - blanks + 1);
  const grid = <View {...gesture.panHandlers} style={{ minWidth: Math.max(308, Math.ceil(26 * fontScale) * 7) }}>
    <View style={{ flexDirection: "row" }}>
      {days.map((day, index) => <Text key={index} variant="small" accessible={false}
        style={{ width: "14.2857%", textAlign: "center", paddingVertical: 6, color: colors.textMuted }}>
        {day.toLocaleDateString(undefined, { weekday: "short" })}
      </Text>)}
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {cells.map((number, index) => {
        if (number < 1 || number > count) return <View key={index} style={{ width: "14.2857%", minHeight: 44 }} />;
        const value = dateString(new Date(year, monthIndex, number));
        const logged = dates.has(value), active = selected === value, isToday = value === today;
        return <Pressable key={index} onPress={() => onSelect(value)} accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={new Date(year, monthIndex, number).toLocaleDateString(undefined,
            { weekday: "long", month: "long", day: "numeric", year: "numeric" }) +
            (isToday ? ", today" : "") + (logged ? ", logged day" : ", no logged day")}
          style={({ pressed }) => [{ width: "14.2857%", minHeight: 44, alignItems: "center",
            justifyContent: "center", paddingVertical: 3, opacity: pressed ? 0.7 : 1 }]}>
          <View style={{ minHeight: 38, minWidth: 38, padding: 7, borderRadius: 999,
            alignItems: "center", justifyContent: "center",
            backgroundColor: active ? colors.ink : logged ? colors.accentFillStrong : "transparent" }}>
            <Text style={{ color: active ? colors.canvas : isToday ? colors.primary : logged ? colors.loggedDateText : colors.ink,
              fontFamily: active || isToday ? fonts.bold : fonts.medium }}>{number}</Text>
            {logged && !active && <View accessible={false} style={{ position: "absolute", bottom: 1,
              width: 5, height: 5, borderRadius: 3, backgroundColor: colors.indigo }} />}
          </View>
        </Pressable>;
      })}
    </View>
  </View>;
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <IconButton name="chevron-left" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} color={colors.text700} />
      <Text variant="headline" accessibilityRole="header" accessibilityLiveRegion="polite">
        {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </Text>
      <IconButton name="chevron-right" accessibilityLabel="Next month" onPress={() => changeMonth(1)} color={colors.text700} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1 }}>{grid}</View>
    </ScrollView>
    {legend && <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, paddingVertical: 6 }}>
      {[{ title: "Logged", fill: colors.accentFillStrong }, { title: "Selected", fill: colors.ink }].map((item) =>
        <View key={item.title} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: item.fill }} />
          <Text variant="small" style={{ color: colors.textSecondary }}>{item.title}</Text>
        </View>)}
      <Text variant="small" style={{ color: colors.primary }}>Today</Text>
    </View>}
    {helper && <Text variant="caption" style={{ textAlign: "center", color: colors.textSecondary }}>{helper}</Text>}
  </View>;
}
