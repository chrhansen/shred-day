import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth";
import { shred } from "../../services/shred";
import { Button, Field, Icon, Screen, Text, colors } from "../../components/ui";
import { ReauthSheet } from "../../components/settings/reauth-sheet";

export default function DeleteAccountScreen() {
  const auth = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [confirming, setConfirming] = useState(false);
  const journals = useQueries({ queries: (auth.user?.available_seasons || [0]).map(season => ({
    queryKey: ["days", season, auth.user?.id], queryFn: () => shred.days(season), enabled: Boolean(auth.user),
  })) });
  const total = journals.every(query => Boolean(query.data) && !query.isError) ? journals.reduce((count, query) => count + (query.data?.length || 0), 0) : null;
  const destroy = async () => {
    if (confirmation !== "DELETE") return false;
    try {
      await shred.deleteAccount(); auth.markAccountDeleted(); setConfirming(false); router.replace("/account-deleted");
      return true;
    } catch {
      Alert.alert("Couldn't delete your account", "We couldn't confirm deletion. Check your connection and try again.", [{ text: "OK" }]);
      return false;
    }
  };
  return <Screen edges={["left", "right", "bottom"]} contentInsetAdjustmentBehavior="never"
    contentStyle={{ paddingVertical: 24, paddingHorizontal: 20, gap: 18, flexGrow: 1 }}>
    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.errorBg, alignItems: "center", justifyContent: "center" }}>
      <Icon name="triangle" size={26} color={colors.destructive} /></View>
    <Text variant="titleM" accessibilityRole="header">Delete your Shred.Day account</Text>
    <Text>This permanently deletes your account and everything in it:</Text>
    {[`${total === null ? "Your" : total} ski ${total === 1 ? "day" : "days"} with their photos, notes and tags`,
      "Your skis and tag labels", "Every public link you've shared", "Your profile and sign-in methods"].map(item => <View key={item} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <Icon name="x" size={18} color={colors.destructive} /><Text style={{ flex: 1 }}>{item}</Text></View>)}
    <Text variant="footnote" style={{ color: colors.textSecondary }}>{"This can't be undone. To keep a copy of your days, export them from shred.day first."}</Text>
    <Field label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation}
      autoCapitalize="characters" autoCorrect={false} style={{ fontFamily: "Menlo", fontSize: 17, letterSpacing: 2 }} />
    <View style={{ flex: 1 }} />
    <Button title="Continue" variant="destructive" disabled={confirmation !== "DELETE"} onPress={() => setConfirming(true)} />
    <Text variant="caption" style={{ color: colors.textSecondary, textAlign: "center" }}>{"Next, you'll confirm your sign-in."}</Text>
    <ReauthSheet visible={confirming} onClose={() => setConfirming(false)} action="Delete Account" destructive onConfirmed={destroy}
      reason="For your security, confirm your sign-in once more. Only a method already connected to your account can be used." />
  </Screen>;
}
