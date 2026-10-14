import { ActionSheetIOS, Alert, Linking, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Application from "expo-application";
import { useAuth } from "../../../contexts/auth";
import { shred } from "../../../services/shred";
import { Group, Icon, Notice, Row, Screen, Text, colors } from "../../../components/ui";
import { Avatar } from "../../../components/settings/avatar";
import { seasonDateRange } from "../../../components/season-picker";

export default function SettingsScreen() {
  const auth = useAuth();
  const skis = useQuery({ queryKey: ["skis", auth.user?.id], queryFn: shred.skis });
  const tags = useQuery({ queryKey: ["tags", auth.user?.id], queryFn: shred.tags });
  const seasonStart = auth.user?.season_start_day || "09-01";
  const [month, day] = seasonStart.split("-").map(Number);
  const cutoffLabel = new Date(2000, month - 1, day).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const signOut = () => {
    const run = () => { void auth.logout(); };
    const message = "You can sign back in any time. Your journal stays on Shred.Day.";
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options: ["Cancel", "Sign Out"], cancelButtonIndex: 0,
      destructiveButtonIndex: 1, message }, index => { if (index === 1) run(); });
    else Alert.alert("Sign Out", message, [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: run }]);
  };
  const methodLabels = auth.confirmedMethods.map(method => method === "password" ? "Email" : method === "google" ? "Google" : "Apple");
  return <View style={{ flex: 1, backgroundColor: colors.surfaceSubtle }}>
    <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: colors.canvas }}>
      <View style={{ minHeight: 62, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text variant="header" accessibilityRole="header">Settings</Text>
      </View>
    </SafeAreaView>
    <Screen edges={["left", "right"]} background={colors.surfaceSubtle} contentInsetAdjustmentBehavior="never"
      contentStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}>
      <Group><Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => router.push("/settings/profile")}
        style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, minHeight: 84 }}>
        <Avatar identity={auth.user} />
        <View style={{ flex: 1, gap: 4 }}><Text variant="headline">{auth.user?.username ? "@" + auth.user.username : "Your profile"}</Text>
          <Text variant="footnote" style={{ color: colors.textSecondary }}>{auth.user?.email}</Text></View>
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </Pressable></Group>
      <Group label="Season" footer={`This season runs ${seasonDateRange(0, seasonStart).label}.`}>
        <Row icon="calendar" title="Season starts" value={cutoffLabel} onPress={() => router.push("/settings/profile")} />
      </Group>
      <Group label="Journal" footer="Imports, CSV export and Google Sheets setup are on shred.day.">
        <Row icon="ski" title="Skis" value={skis.data ? String(skis.data.length) : undefined}
          onPress={() => router.push({ pathname: "/settings/gear", params: { kind: "skis" } })} />
        <Row icon="tags" title="Tags" value={tags.data ? String(tags.data.length) : undefined}
          onPress={() => router.push({ pathname: "/settings/gear", params: { kind: "tags" } })} />
      </Group>
      {(skis.isError || tags.isError) && <Notice message="Couldn't load your gear counts." onRetry={() => { void skis.refetch(); void tags.refetch(); }} />}
      <Group label="Account">
        <Row icon="lock" title="Sign-in methods" value={methodLabels.join(", ")} onPress={() => router.push("/settings/logins")} />
        <Row icon="logout" title="Sign Out" onPress={signOut} trailing={<View />} />
      </Group>
      <Group label="About">
        <Row icon="lock" title="Privacy Policy" onPress={() => void Linking.openURL("https://shred.day/privacy")}
          trailing={<Icon name="external" size={17} color={colors.textMuted} />} />
        <Row icon="help" title="Support" onPress={() => void Linking.openURL("https://shred.day/support")}
          trailing={<Icon name="external" size={17} color={colors.textMuted} />} />
      </Group>
      <Group><Pressable accessibilityRole="button" onPress={() => router.push("/settings/delete")}
        style={{ minHeight: 52, alignItems: "center", justifyContent: "center", padding: 14 }}>
        <Text variant="bodyMedium" style={{ color: colors.destructive }}>Delete Account…</Text>
      </Pressable></Group>
      <Text variant="small" style={{ color: colors.textSecondary, textAlign: "center" }}>
        Shred.Day {Application.nativeApplicationVersion || "1.0.1"}{Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ""}
      </Text>
    </Screen>
  </View>;
}
