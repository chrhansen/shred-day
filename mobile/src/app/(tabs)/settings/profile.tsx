import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, View } from "react-native";
import { router, Stack, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/auth";
import { shred } from "../../../services/shred";
import { photoForm } from "../../../lib/photo-upload";
import { ApiError } from "../../../lib/api";
import { Button, Card, Field, Notice, Screen, Text, colors, useToast } from "../../../components/ui";
import { Avatar } from "../../../components/settings/avatar";
import { SeasonStartFields, UsernameField, usernameError } from "../../../components/settings/profile-fields";
import { seasonDateRange } from "../../../components/season-picker";

export default function ProfileScreen() {
  const auth = useAuth();
  const client = useQueryClient();
  const navigation = useNavigation();
  const toast = useToast();
  const [username, setUsername] = useState(auth.user?.username || "");
  const [cutoff, setCutoff] = useState(auth.user?.season_start_day || "09-01");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoDenied, setPhotoDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [photoFailed, setPhotoFailed] = useState(false);
  const dirty = username.trim() !== (auth.user?.username || "") || cutoff !== (auth.user?.season_start_day || "09-01");
  usePreventRemove(dirty && !busy, ({ data }) => Alert.alert("Discard changes?", "Your profile edits won't be saved.", [
    { text: "Keep Editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
  ]));
  const save = async () => {
    if (busy || !dirty) return;
    const validation = usernameError(username.trim()); setNameError(validation); if (validation) return;
    setBusy(true); setFailed(false);
    try {
      await shred.updateAccount({ username: username.trim() || null, season_start_day: cutoff });
      await auth.refresh(); await client.invalidateQueries(); toast("Profile saved");
      if (navigation.isFocused()) router.back();
    } catch (cause) {
      setFailed(true);
      if (cause instanceof ApiError && /username.*taken/i.test(cause.message)) setNameError("That username is taken. Try another.");
      else if (cause instanceof ApiError && /username/i.test(cause.message)) setNameError("Use 3–20 letters, numbers, or underscores.");
    } finally { setBusy(false); }
  };
  const photo = async () => {
    if (busy || photoBusy) return;
    setPhotoFailed(false); setPhotoDenied(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setPhotoDenied(true); return; }
      const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      if (selection.canceled) return;
      setPhotoBusy(true); await shred.updateAccount(photoForm(selection.assets[0], "user[avatar]")); await auth.refresh(); toast("Photo updated");
    } catch { setPhotoFailed(true); }
    finally { setPhotoBusy(false); }
  };
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <Stack.Screen options={{ headerRight: () => busy ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <ActivityIndicator color={colors.textSecondary} /><Text variant="chip" style={{ color: colors.textSecondary }}>Saving</Text></View>
      : <Pressable accessibilityRole="button" accessibilityLabel="Save profile" accessibilityState={{ disabled: !dirty || photoBusy }}
        disabled={!dirty || photoBusy} onPress={() => void save()} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
        <Text variant="headline" style={{ color: dirty && !photoBusy ? colors.primary : colors.textMuted }}>Save</Text>
      </Pressable> }} />
    <Screen edges={["left", "right", "bottom"]} contentInsetAdjustmentBehavior="never" contentStyle={{ padding: 20, gap: 24 }}>
      <View style={{ alignItems: "center", gap: 12 }}><Avatar identity={auth.user} size={88} />
        <Button title={photoBusy ? "Uploading…" : "Change Photo"} icon="camera" variant="compact" busy={photoBusy}
          disabled={busy} onPress={() => void photo()} /></View>
      {photoDenied && <Notice tone="info" title="Photo access is off" message="Allow Shred.Day to use your photos in iOS Settings, then come back to add them." />}
      {photoDenied && <Button variant="dark" title="Open Settings" onPress={() => void Linking.openSettings()} />}
      {photoFailed && <Notice message="Couldn't update your photo. Check your connection and try again." onRetry={() => void photo()} />}
      {failed && <Notice message={nameError ? "Fix the highlighted field and try again." : "Couldn't confirm your profile update. Check your connection and try again."} />}
      <Field label="Email" value={auth.user?.email || ""} readOnly />
      <UsernameField value={username} onChange={value => { setUsername(value); if (nameError) setNameError(usernameError(value.trim())); }}
        error={nameError} disabled={busy} />
      <SeasonStartFields value={cutoff} onChange={setCutoff} disabled={busy} />
      <Text variant="caption" style={{ color: colors.textSecondary }}>This date (month and day) defines the start of your ski season each year. The default is September 1st, but you might prefer a different date, e.g. if you live in the southern hemisphere.</Text>
      <Card style={{ borderWidth: 0, backgroundColor: colors.surfaceSubtle, padding: 14, gap: 8 }}>
        <Text variant="subhead">Season ranges</Text>
        <Text variant="footnote">This season — {seasonDateRange(0, cutoff).label}</Text>
        <Text variant="footnote">Last season — {seasonDateRange(-1, cutoff).label}</Text>
      </Card>
    </Screen>
  </KeyboardAvoidingView>;
}
