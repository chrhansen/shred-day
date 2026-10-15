import { View } from "react-native";
import { Button, Icon, Text, colors } from "../ui";
import { radius } from "../../theme";

export function MapFallback({ onRetry, missing = false }: { onRetry?: () => void; missing?: boolean }) {
  return <View style={{ minHeight: 170, padding: 18, alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: colors.fill, borderRadius: radius.l }}>
    <Icon name={missing ? "pin" : "wifi-off"} size={26} color={colors.textSecondary} />
    <Text variant="bodyMedium">{missing ? "No resort locations yet" : "Map couldn't load"}</Text>
    <Text variant="caption" style={{ textAlign: "center", color: colors.textSecondary }}>
      Your resorts and day counts are listed below.
    </Text>
    {onRetry && <Button variant="compact" icon="refresh" title="Retry" onPress={onRetry} />}
  </View>;
}
