import { View } from "react-native";
import { Image } from "expo-image";
import type { Account } from "../../lib/types";
import { Text, colors } from "../ui";

type Identity = Pick<Account, "email" | "username" | "avatar_url" | "full_name">;
export function initials(identity?: Identity | null) {
  const value = identity?.full_name?.trim() || identity?.username || identity?.email.split("@")[0] || "Skier";
  const words = value.split(/[\s_.-]+/).filter(Boolean);
  return words.length > 1 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : value.slice(0, 2).toUpperCase();
}
export function Avatar({ identity, size = 56 }: { identity?: Identity | null; size?: number }) {
  return identity?.avatar_url ? <Image source={identity.avatar_url} accessibilityLabel="Profile photo"
    style={{ width: size, height: size, borderRadius: size / 2 }} />
    : <View accessibilityLabel="Profile initials" style={{ width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" }}>
      <Text variant="bodyMedium" style={{ fontSize: Math.max(16, size / 3), lineHeight: size / 2, color: colors.text600 }}>{initials(identity)}</Text>
    </View>;
}
