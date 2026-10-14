import { ScrollView, StyleSheet, View, type ViewProps, type ScrollViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { colors, radius, type } from "../theme";
import { Text } from "./ui/text";

export { colors, fonts, type, space, radius, layout, shadow, motion } from "../theme";
export { Text } from "./ui/text";
export { Button, IconButton, type ButtonProps } from "./ui/buttons";
export { Field } from "./ui/field";
export { Icon, type IconName } from "./ui/icon";
export { Pill, Chip, TagPill, SkiChip, Segmented, IconSegmented } from "./ui/selection";
export { Notice, EmptyState, Skeleton } from "./ui/feedback";
export { Group, GroupedList, Row } from "./ui/group";
export { BottomSheet } from "./ui/sheet";
export { Calendar } from "./ui/calendar";
export { ToastProvider, ToastViewport, useToast } from "./ui/toast";

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 32, gap: 18 },
  text: { ...type.body, color: colors.ink },
  title: type.titleL,
  eyebrow: { ...type.label, color: colors.textSecondary },
  card: { backgroundColor: colors.canvas, borderRadius: radius.card, padding: 16,
    gap: 12, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  field: { ...type.body, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.canvas, padding: 14, borderRadius: radius.input,
    color: colors.ink, minHeight: 50 },
  button: { backgroundColor: colors.primary, minHeight: 52, paddingVertical: 14,
    paddingHorizontal: 18, borderRadius: radius.l, alignItems: "center", justifyContent: "center" },
  pill: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas },
  muted: { color: colors.textSecondary },
  error: { color: colors.destructive },
});
export function Screen({ children, refreshControl, contentStyle, style, background = colors.canvas,
  edges = ["top", "left", "right"], scroll = true, ...props }: {
  children: ReactNode; contentStyle?: ScrollViewProps["contentContainerStyle"];
  style?: ViewProps["style"]; background?: string; edges?: Edge[]; scroll?: boolean;
} & Omit<ScrollViewProps, "style" | "children" | "contentContainerStyle">) {
  return <SafeAreaView style={[styles.screen, { backgroundColor: background }, style]} edges={edges}>
    {scroll ? <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
      contentInsetAdjustmentBehavior="automatic" {...props} refreshControl={refreshControl}
      contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView>
      : <View style={[{ flex: 1 }, contentStyle]}>{children}</View>}
  </SafeAreaView>;
}
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ gap: 8 }}><Text accessibilityRole="header" variant="titleL">{title}</Text>
    {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
  </View>;
}
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}
