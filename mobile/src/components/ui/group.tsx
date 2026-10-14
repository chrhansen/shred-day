import { Children, Fragment, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius } from "../../theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

export function Group({ children, label, footer, style }: { children: ReactNode;
  label?: string; footer?: string; style?: StyleProp<ViewStyle>;
}) {
  const rows = Children.toArray(children);
  return <View style={[{ gap: 8 }, style]}>
    {label && <Text variant="label" style={{ paddingHorizontal: 4, color: colors.textSecondary }}>{label}</Text>}
    <View style={{ backgroundColor: colors.canvas, borderRadius: radius.card,
      borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
      {rows.map((child, index) => <Fragment key={index}>{child}
        {index < rows.length - 1 && <View style={{ height: 1, backgroundColor: colors.divider, marginLeft: 56 }} />}
      </Fragment>)}
    </View>
    {footer && <Text variant="caption" style={{ paddingHorizontal: 4, color: colors.textSecondary }}>{footer}</Text>}
  </View>;
}
export const GroupedList = Group;
export function Row({ title, value, subtitle, icon, onPress, trailing, destructive,
  accessibilityLabel, disabled, style }: { title: string; value?: string; subtitle?: string;
  icon?: IconName; onPress?: () => void; trailing?: ReactNode; destructive?: boolean;
  accessibilityLabel?: string; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const content = <>
    {icon && <View style={{ width: 30, height: 30, backgroundColor: colors.fill,
      borderRadius: radius.m, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={17} color={destructive ? colors.destructive : colors.text700} />
    </View>}
    <View style={{ flex: 1, gap: 3 }}><Text variant="bodyMedium"
      style={{ color: destructive ? colors.destructive : colors.ink }}>{title}</Text>
      {subtitle && <Text variant="caption" style={{ color: colors.textSecondary }}>{subtitle}</Text>}
    </View>
    {value && <Text variant="callout" style={{ color: colors.textSecondary, flexShrink: 1 }}>{value}</Text>}
    {trailing ?? (onPress && <Icon name="chevron-right" size={18} color={colors.textMuted} />)}
  </>;
  const box: ViewStyle = { minHeight: 52, paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: "row", alignItems: "center", gap: 12 };
  return onPress ? <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
    accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }}
    style={({ pressed }) => [box, { backgroundColor: pressed ? colors.fill : undefined,
      opacity: disabled ? 0.5 : 1 }, style]}>{content}</Pressable>
    : <View style={[box, style]}>{content}</View>;
}
