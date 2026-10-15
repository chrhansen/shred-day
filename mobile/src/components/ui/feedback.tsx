import { View } from "react-native";
import { colors, radius } from "../../theme";
import { Icon, type IconName } from "./icon";
import { Button } from "./buttons";
import { Text } from "./text";
import type { ReactNode } from "react";

export function Notice({ error, message, title, onRetry, tone = "error" }: {
  error?: unknown; message?: string; title?: string; onRetry?: () => void;
  tone?: "error" | "info" | "neutral";
}) {
  const red = tone === "error";
  const foreground = red ? colors.errorText : tone === "info" ? colors.infoText : colors.text600;
  return <View accessibilityLiveRegion="polite" style={{ padding: 14, gap: 10,
    borderWidth: 1, borderRadius: radius.l,
    borderColor: red ? colors.errorBorder : tone === "info" ? colors.accentBorder : colors.border,
    backgroundColor: red ? colors.errorBg : tone === "info" ? colors.accentFill : colors.surfaceSubtle }}>
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Icon name={red ? "alert" : "info"} size={18} color={foreground} />
      <View style={{ flex: 1, gap: 4 }}>
        {title && <Text variant="bodyMedium" style={{ color: foreground }}>{title}</Text>}
        <Text variant="footnote" style={{ color: foreground }}>
          {message ?? (error instanceof Error ? error.message : String(error ?? "Something went wrong. Try again."))}
        </Text>
      </View>
    </View>
    {onRetry && <View style={{ alignSelf: "flex-start" }}><Button variant="pill" icon="refresh"
      title="Try again" onPress={onRetry} /></View>}
  </View>;
}
export function EmptyState({ title, description, icon = "mountain", action }: {
  title: string; description?: string; icon?: IconName; action?: ReactNode;
}) {
  return <View style={{ alignItems: "center", paddingVertical: 44, paddingHorizontal: 24, gap: 14 }}>
    <View style={{ width: 64, height: 64, borderRadius: 32, justifyContent: "center",
      alignItems: "center", backgroundColor: colors.accentFill }}>
      <Icon name={icon} size={28} color={colors.primary} />
    </View>
    <Text variant="titleM" style={{ textAlign: "center" }}>{title}</Text>
    {description && <Text variant="callout" style={{ textAlign: "center", color: colors.textSecondary }}>{description}</Text>}
    {action}
  </View>;
}
export function Skeleton({ width = "100%", height = 14, borderRadius = 5 }: {
  width?: number | `${number}%`; height?: number; borderRadius?: number;
}) {
  return <View accessible={false} style={{ width, height, borderRadius, backgroundColor: colors.fill }} />;
}
