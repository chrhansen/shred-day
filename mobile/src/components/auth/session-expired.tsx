import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Screen, Text, colors } from "../ui";
import { useAuth } from "../../contexts/auth";
import { Brand } from "./brand";
import { Avatar } from "../settings/avatar";

export function SessionExpired() {
  const auth = useAuth();
  const identity = auth.expiredIdentity;
  return <Screen edges={["top", "left", "right", "bottom"]}
    contentStyle={{ flexGrow: 1, padding: 24, paddingTop: 20, gap: 20 }}>
    <Brand />
    <View style={{ flex: 1, minHeight: 240, justifyContent: "center", gap: 16 }}>
      <Text variant="titleL" accessibilityRole="header">{auth.emailConfirmationRequired ? "Confirm your email" : "Your session expired"}</Text>
      <Text style={{ color: colors.textSecondary }}>{auth.emailConfirmationRequired
        ? "Password sign-in now requires a confirmed email. Confirm your address and set your password to return to your journal. You can also continue with Google or Apple."
        : "Sign in again to keep logging days. Your journal is safe on Shred.Day."}</Text>
      {identity && <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
        <Avatar identity={identity} size={44} />
        <View style={{ flex: 1, gap: 4 }}><Text variant="bodyMedium">{identity.username ? "@" + identity.username : "Your journal"}</Text>
          <Text variant="footnote" style={{ color: colors.textSecondary }}>{identity.email}</Text></View>
      </Card>}
    </View>
    <Button title={auth.emailConfirmationRequired ? "Confirm Email" : "Sign In Again"}
      onPress={() => router.push(auth.emailConfirmationRequired ? "/auth/email?mode=confirm" : "/auth/email")} />
    <Button title="Use Another Account" variant="secondary" onPress={auth.resetExpired} />
  </Screen>;
}
