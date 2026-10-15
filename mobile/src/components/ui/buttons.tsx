import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type PressableProps,
  type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { colors, layout, radius, shadow, type } from "../../theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string; busy?: boolean; secondary?: boolean; destructive?: boolean;
  variant?: "primary" | "secondary" | "dark" | "destructive" | "text" | "pill" | "compact";
  icon?: IconName; style?: StyleProp<ViewStyle>;
};
export function Button({ title, busy = false, secondary, destructive, variant,
  disabled, icon, style, ...props }: ButtonProps) {
  const kind = variant ?? (destructive ? "destructive" : secondary ? "secondary" : "primary");
  const primary = kind === "primary";
  const red = kind === "destructive";
  const textOnly = kind === "text";
  const outline = ["secondary", "pill", "compact"].includes(kind);
  const foreground = textOnly ? colors.primary : outline ? colors.ink : colors.canvas;
  const blocked = Boolean(disabled || busy);
  const fill = disabled ? (red ? colors.destructiveDisabled : primary ? colors.borderStrong : colors.fill)
    : red ? colors.destructive : kind === "dark" ? colors.ink : outline ? colors.canvas : "transparent";
  const content = <>
    {busy && <ActivityIndicator size="small" color={foreground} accessibilityLabel="Working" />}
    {!busy && icon && <Icon name={icon} size={18} color={foreground} strokeWidth={2} />}
    <Text variant={primary || red || kind === "dark" ? "button" : "bodyMedium"}
      style={{ color: foreground, textAlign: "center", ...(textOnly ? type.navAction : {}) }}>{title}</Text>
  </>;
  return <Pressable {...props} accessibilityRole="button"
    accessibilityState={{ disabled: blocked, busy }} disabled={blocked}
    style={({ pressed }) => [primary && !disabled && shadow.primaryButton,
      { borderRadius: kind === "pill" || kind === "compact" ? radius.pill : radius.l,
        opacity: pressed ? 0.7 : busy ? 0.85 : 1 }, style]}>
    {primary && !disabled ? <LinearGradient colors={colors.primaryGradient}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={buttonStyles.content}>{content}</LinearGradient>
      : <View style={[buttonStyles.content, { backgroundColor: fill,
          borderWidth: outline ? 1 : 0, borderColor: colors.border,
          borderRadius: kind === "pill" || kind === "compact" ? radius.pill : radius.l,
          minHeight: textOnly || kind === "compact" || kind === "pill" ? layout.minTouch : layout.primaryButton,
          paddingVertical: kind === "compact" ? 10 : 14 }]}>{content}</View>}
  </Pressable>;
}
export function IconButton({ name, accessibilityLabel, onPress, color = colors.ink,
  size = 22, floating = false, disabled, style, ...props }: Omit<PressableProps, "style" | "children"> & {
  name: IconName; accessibilityLabel: string; color?: string; size?: number;
  floating?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return <Pressable {...props} onPress={onPress} accessibilityLabel={accessibilityLabel}
    accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled}
    style={({ pressed }) => [{ minWidth: 44, minHeight: 44, justifyContent: "center",
      alignItems: "center", borderRadius: radius.pill,
      backgroundColor: floating ? colors.floatingButtonBg : "transparent",
      opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, floating && shadow.floating, style]}>
    {floating && Platform.OS === "ios" && <BlurView tint="light" intensity={10}
      pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius.pill, overflow: "hidden" }]} />}
    <Icon name={name} size={size} color={color} />
  </Pressable>;
}
const buttonStyles = StyleSheet.create({ content: { minHeight: 52, paddingHorizontal: 18,
  paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center",
  gap: 8, borderRadius: radius.l } });
