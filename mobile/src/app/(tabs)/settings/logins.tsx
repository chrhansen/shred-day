import { useState } from "react";
import { View } from "react-native";
import { useAuth } from "../../../contexts/auth";
import { Button, Group, Icon, Row, Screen, Text, colors, useToast } from "../../../components/ui";
import { ReauthSheet } from "../../../components/settings/reauth-sheet";
import { googleConfigured } from "../../../lib/provider-login";
import type { Provider } from "../../../components/auth/provider-buttons";

export default function LoginMethodsScreen() {
  const auth = useAuth();
  const toast = useToast();
  const [connecting, setConnecting] = useState<Provider | null>(null);
  const connected = auth.confirmedMethods;
  const connect = async () => {
    if (!connecting) return;
    await auth.socialLogin(connecting, true);
    toast(connecting === "apple" ? "Sign in with Apple connected" : "Google connected");
  };
  return <Screen edges={["left", "right"]} background={colors.surfaceSubtle} contentInsetAdjustmentBehavior="never"
    contentStyle={{ padding: 16, gap: 22, paddingBottom: 40 }}>
    <Text variant="footnote" style={{ color: colors.textSecondary }}>Any connected method opens the same journal.</Text>
    <Group>{(["password", "google", "apple"] as const).map(method => {
      const known = connected.includes(method);
      const name = method === "password" ? "Email and password" : method === "google" ? "Google" : "Apple";
      return <Row key={method} icon={method === "password" ? "mail" : "lock"} title={name}
        subtitle={known ? undefined : "Not confirmed on this iPhone"} style={{ minHeight: 64 }}
        trailing={known ? <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="check" color={colors.success} size={15} /><Text variant="label" style={{ color: colors.success }}>Connected</Text></View>
          : method !== "password" ? <Button title="Connect" variant="compact" disabled={method === "google" && !googleConfigured}
            onPress={() => setConnecting(method)} /> : <Text variant="caption" style={{ color: colors.textSecondary }}>Use your password</Text>} />;
    })}</Group>
    <Text variant="caption" style={{ color: colors.textSecondary }}>{"This screen shows methods confirmed on this iPhone. To connect a new method, you'll confirm a sign-in you already use. A newly connected method can't be used to confirm account deletion until you've signed in with it."}</Text>
    <ReauthSheet visible={Boolean(connecting)} onClose={() => setConnecting(null)} action="Confirm and Connect"
      operationProvider={connecting || undefined} onConfirmed={connect}
      reason={`To connect ${connecting === "apple" ? "Sign in with Apple" : "Google"}, confirm your current sign-in first.`} />
  </Screen>;
}
