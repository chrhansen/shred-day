import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import type { DayEntry } from "../lib/types";
import { relativeDay } from "../lib/journal";
import { colors, Icon, Text } from "./ui";

export function JournalRow({ day, calendar = false, onPress, onLongPress }: {
  day: DayEntry; calendar?: boolean; onPress: () => void; onLongPress: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.6;
  const size = calendar ? 72 : 84;
  const photo = day.photos?.[0];
  const uri = photo?.preview_url || photo?.full_url;
  const photoCount = day.photos?.length || 0;
  const equipment = [day.ski_names.join(", "), day.tag_names.join(", ")].filter(Boolean).join(" · ");
  const date = relativeDay(day.date);
  return <Pressable accessibilityRole="button"
    accessibilityLabel={[day.resort_name, "day " + day.day_number, date, equipment,
      photoCount + (photoCount === 1 ? " photo" : " photos")].join(", ")}
    accessibilityHint="Opens this day. Long press for sharing, editing and deletion."
    onPress={onPress} onLongPress={onLongPress} delayLongPress={450}
    style={({ pressed }) => [styles.row, stacked && styles.stacked, { opacity: pressed ? 0.65 : 1 }]}>
    <View style={[styles.thumbnail, { width: size, height: size }]}>
      {uri ? <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        : <Icon name="mountain" size={26} color={colors.textMuted} />}
      {photoCount > 1 && <View style={styles.badge}>
        <Icon name="camera" size={12} color={colors.canvas} />
        <Text variant="badge" style={{ color: colors.canvas }}>{photoCount}</Text>
      </View>}
    </View>
    <View style={[styles.copy, stacked && { flex: undefined, width: "100%" }]}>
      <Text variant="headline" numberOfLines={stacked ? undefined : 1}>{day.resort_name}</Text>
      <Text variant="subhead" style={styles.secondary}>#{day.day_number} · {date}</Text>
      {day.sync_state && <Text variant="caption" style={{ color: day.sync_state === "failed" ? colors.destructive : colors.textSecondary }}>
        {day.sync_state === "failed" ? "Needs attention" : "Waiting to sync"}</Text>}
      {equipment ? <Text variant="footnote" style={{ color: colors.text700 }} numberOfLines={stacked ? undefined : 1}>{equipment}</Text> : null}
      {!calendar && day.notes ? <Text variant="footnote" style={styles.secondary} numberOfLines={stacked ? undefined : 1}>{day.notes}</Text> : null}
    </View>
    {calendar && !stacked && <Icon name="chevron-right" size={18} color={colors.borderStrong} />}
  </Pressable>;
}

export function JournalSeparator() {
  return <View style={{ marginLeft: 114, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />;
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  stacked: { flexDirection: "column", alignItems: "flex-start" },
  thumbnail: { borderRadius: 12, overflow: "hidden", backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", bottom: 5, right: 5, minHeight: 20, paddingHorizontal: 6,
    borderRadius: 6, flexDirection: "row", gap: 3, alignItems: "center", backgroundColor: colors.photoBadge },
  copy: { flex: 1, gap: 2 },
  secondary: { color: colors.textSecondary },
});
