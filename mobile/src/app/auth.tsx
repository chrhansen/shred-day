import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/auth";
import { Button, Notice, Screen, Text, colors } from "../components/ui";
import { Brand, LegalLinks } from "../components/auth/brand";
import { ProviderButtons, type Provider } from "../components/auth/provider-buttons";
import { providerSignInNotice } from "../lib/auth-presentation";
import { SessionExpired } from "../components/auth/session-expired";

export default function AuthScreen() {
  const auth = useAuth();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [notice, setNotice] = useState<{ message: string; canceled: boolean } | null>(null);
  const perform = async (provider: Provider) => {
    if (busy) return;
    setNotice(null); setBusy(provider);
    try { await auth.socialLogin(provider); }
    catch (cause) {
      setNotice(providerSignInNotice(cause, provider));
    } finally { setBusy(null); }
  };
  if (auth.expired) return <SessionExpired />;
  return <Screen contentStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, gap: 0 }} edges={["top", "left", "right", "bottom"]}>
    <Brand />
    <View style={{ flex: 1, minHeight: 270, justifyContent: "center", gap: 16, paddingVertical: 36 }}>
      <Text variant="display" accessibilityRole="header">Remember{"\n"}every <Text variant="display" style={{ color: colors.textSecondary }}>shred.day</Text></Text>
      <Text style={{ fontSize: 17, lineHeight: 25, color: colors.textSecondary }}>The simplest way to track your ski or snowboard season. Log days, see stats, and never forget another epic run.</Text>
    </View>
    <View style={{ gap: 12 }}>
      {notice && <Notice message={notice.message} tone={notice.canceled ? "neutral" : "error"} />}
      <ProviderButtons busy={busy} onPress={provider => void perform(provider)} />
      <Button title="Continue with Email" variant="secondary" icon="mail" disabled={Boolean(busy)} onPress={() => router.push("/auth/email")} />
      <Pressable accessibilityRole="button" accessibilityLabel="Create an account" disabled={Boolean(busy)}
        onPress={() => router.push({ pathname: "/auth/email", params: { mode: "signup" } })}
        style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <Text variant="footnote" style={{ color: colors.textSecondary }}>New here? <Text variant="subhead" style={{ color: colors.primary }}>Create an account</Text></Text>
      </Pressable>
      <LegalLinks />
    </View>
  </Screen>;
}
