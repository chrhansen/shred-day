import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/auth";
import { Button, Icon, Notice, Screen, Text, colors } from "../components/ui";
import { clearAccountImages } from "../lib/account-cache";

export default function AccountDeletedScreen() {
  const { logout, deletionConfirmed, acknowledgeDeletion } = useAuth();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!deletionConfirmed) return;
    let mounted = true;
    const finish = async () => {
      try {
        await logout(); await clearAccountImages();
        if (mounted) setReady(true);
      } catch { if (mounted) setFailed(true); }
    };
    void finish(); return () => { mounted = false; };
  }, [logout, attempt, deletionConfirmed]);
  return <Screen edges={["top", "left", "right", "bottom"]} contentStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 18 }}>
    {!ready && !failed ? <><ActivityIndicator color={colors.indigo} /><Text>Finishing sign-out…</Text></>
      : <>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.fill, justifyContent: "center", alignItems: "center" }}>
          <Icon name="circle-check" size={32} color={colors.textSecondary} /></View>
        <Text variant="titleM" accessibilityRole="header" style={{ textAlign: "center" }}>Your account has been deleted</Text>
        {ready ? <Text style={{ color: colors.textSecondary, textAlign: "center" }}>{"Your journal and shared pages have been removed, and you've been signed out on this iPhone."}</Text>
          : <Notice message="Your account was deleted. Couldn't finish clearing this iPhone's cached data. Try again." onRetry={() => { setFailed(false); setAttempt(attempt + 1); }} />}
        <Button title="Done" variant="dark" disabled={!ready} style={{ alignSelf: "stretch" }} onPress={() => { acknowledgeDeletion(); router.replace("/auth"); }} />
      </>}
  </Screen>;
}
