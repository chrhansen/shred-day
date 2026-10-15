import { View, type ViewProps } from "react-native";
import type { ReactNode } from "react";
import { colors, radius } from "../../theme";
import { Icon, Text, type IconName } from "../ui";

export function StatCard({ title, icon, right, children, style }: ViewProps & {
  title: string; icon?: IconName; right?: ReactNode;
}) {
  return <View style={[{ backgroundColor: colors.canvas, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.xl, padding: 16, gap: 14 }, style]}>
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      {icon && <Icon name={icon} size={18} color={colors.indigo} />}
      <Text accessibilityRole="header" variant="headline" style={{ flexGrow: 1 }}>{title}</Text>
      {right}
    </View>
    {children}
  </View>;
}
