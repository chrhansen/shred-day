import { Linking, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Text, colors } from "../ui";

export function Brand({ size = 40 }: { size?: number }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
    <Image source={require("../../../assets/logo.png")} accessible={false} style={{ width: size, height: size }} />
    <Text variant="sheetTitle">Shred.Day</Text>
  </View>;
}
export function LegalLinks() {
  return <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
    {(["Privacy", "Support"] as const).map(label => <Pressable key={label} accessibilityRole="link"
      onPress={() => void Linking.openURL("https://shred.day/" + label.toLowerCase())}
      style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 6 }}>
      <Text variant="label" style={{ color: colors.textSecondary }}>{label}</Text>
    </Pressable>)}
  </View>;
}
