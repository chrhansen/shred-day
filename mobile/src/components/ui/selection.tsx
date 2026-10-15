import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadow } from "../../theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

export function Pill({ title, selected = false, onPress, disabled, role = "checkbox",
  icon, dashed, error, style, accessibilityLabel }: {
  title: string; selected?: boolean; onPress: () => void; disabled?: boolean;
  role?: "checkbox" | "radio" | "button"; icon?: IconName; dashed?: boolean;
  style?: StyleProp<ViewStyle>; accessibilityLabel?: string; error?: boolean;
}) {
  const contents = <>{selected && <Icon name="check" size={16} color={colors.canvas} strokeWidth={2.5} />}
    {!selected && icon && <Icon name={icon} size={16} color={colors.text600} />}
    <Text variant="chip" style={{ color: selected ? colors.canvas : colors.text700 }}>{title}</Text></>;
  const box: ViewStyle = { minHeight: 40, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.pill };
  return <Pressable accessibilityRole={role} accessibilityLabel={accessibilityLabel ?? title}
    accessibilityState={{ selected, checked: role !== "button" ? selected : undefined, disabled }}
    onPress={onPress} disabled={disabled}
    style={({ pressed }) => [{ minHeight: 44, justifyContent: "center",
      opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }, style]}>
    {selected ? <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }} style={box}>{contents}</LinearGradient>
      : <View style={[box, { backgroundColor: colors.canvas, borderWidth: 1,
        borderColor: error ? colors.destructiveDisabled : dashed ? colors.borderStrong : colors.border,
        borderStyle: dashed ? "dashed" : "solid" }]}>{contents}</View>}
  </Pressable>;
}
export const Chip = Pill;
export function TagPill({ title }: { title: string }) {
  return <View style={{ alignSelf: "flex-start", minHeight: 32, justifyContent: "center",
    backgroundColor: colors.accentFill, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
    <Text variant="chip" style={{ color: colors.tagText }}>{title}</Text>
  </View>;
}
export function SkiChip({ title }: { title: string }) {
  return <View style={{ alignSelf: "flex-start", minHeight: 34, flexDirection: "row",
    alignItems: "center", gap: 6, backgroundColor: colors.fill, borderRadius: radius.m,
    paddingHorizontal: 12, paddingVertical: 8 }}>
    <Icon name="ski" size={16} color={colors.textSecondary} /><Text variant="chip">{title}</Text>
  </View>;
}
export function Segmented<T extends string>({ value, onChange, options, gradient = false, iconOnly = false }: {
  value: T; onChange: (value: T) => void; gradient?: boolean; iconOnly?: boolean;
  options: readonly { value: T; label: string; icon?: IconName }[];
}) {
  return <View style={{ flexDirection: "row", gap: 3, padding: 3,
    backgroundColor: colors.fill, borderRadius: radius.input }}>
    {options.map((option) => {
      const selected = option.value === value;
      const foreground = selected && gradient ? colors.canvas : selected ? colors.ink : colors.textSecondary;
      const content = <>{option.icon && <Icon name={option.icon} size={20} color={foreground} />}
        {!iconOnly && <Text variant="chip" style={{ color: foreground, textAlign: "center" }}>{option.label}</Text>}</>;
      const box: ViewStyle = { minHeight: 38, minWidth: 40, padding: 8, gap: 6,
        flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: radius.m };
      return <Pressable key={option.value} accessibilityRole="tab"
        accessibilityLabel={option.label} accessibilityState={{ selected }}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [{ flex: iconOnly ? undefined : 1, minHeight: 44,
          minWidth: 44, justifyContent: "center", opacity: pressed ? 0.7 : 1 }]}>
        {selected && gradient ? <LinearGradient colors={colors.primaryGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={box}>{content}</LinearGradient>
          : <View style={[box, selected && shadow.segment,
            { backgroundColor: selected ? colors.canvas : "transparent" }]}>{content}</View>}
      </Pressable>;
    })}
  </View>;
}
export function IconSegmented({ value, onChange }: { value: "list" | "calendar"; onChange: (value: "list" | "calendar") => void }) {
  return <Segmented iconOnly value={value} onChange={onChange} options={[
    { value: "list", label: "List", icon: "list" },
    { value: "calendar", label: "Calendar", icon: "calendar" },
  ]} />;
}
