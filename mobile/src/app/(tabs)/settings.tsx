import { useState } from "react";
import { Alert, Linking, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth";
import { shred } from "../../services/shred";
import { googleConfigured } from "../../lib/provider-login";
import { photoForm } from "../../lib/photo-upload";
import {
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Screen,
  styles,
  Text,
} from "../../components/ui";

export default function SettingsScreen() {
  const auth = useAuth();
  const client = useQueryClient();
  const [username, setUsername] = useState(auth.user?.username || "");
  const [seasonStart, setSeasonStart] = useState(
    auth.user?.season_start_day || "09-01",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await operation();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      await shred.updateAccount({
        username: username.trim() || null,
        season_start_day: seasonStart,
      });
      await auth.refresh();
      await client.invalidateQueries();
      setMessage("Profile saved.");
    });
  const avatar = () =>
    run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;
      await shred.updateAccount(photoForm(result.assets[0], "user[avatar]"));
      await auth.refresh();
      setMessage("Photo updated.");
    });
  const link = (provider: "google" | "apple") =>
    run(async () => {
      await auth.socialLogin(provider, true);
      setMessage("Login linked to your account.");
    });
  const destroy = () =>
    run(async () => {
      if (confirmation !== "DELETE") return;
      const method = auth.session?.authentication_method;
      if (method === "google" || method === "apple")
        await auth.socialLogin(method, true);
      else await auth.passwordLogin(auth.user!.email, password);
      await shred.deleteAccount();
      await auth.logout();
    });
  return (
    <Screen>
      <Heading title="Make it yours." subtitle={auth.user?.email} />
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 24 }}
        >
          Profile
        </Text>
        {auth.user?.avatar_url && (
          <Image
            source={auth.user.avatar_url}
            accessibilityLabel="Your profile photo"
            style={{ width: 90, height: 90, borderRadius: 45 }}
          />
        )}
        <Button
          secondary
          title="Choose profile photo"
          disabled={busy}
          onPress={() => void avatar()}
        />
        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          placeholder="3–20 letters, numbers or underscores"
        />
        <Field
          label="Season starts (MM-DD)"
          value={seasonStart}
          onChangeText={setSeasonStart}
          placeholder="09-01"
          maxLength={5}
        />
        <Button title="Save profile" busy={busy} onPress={() => void save()} />
      </Card>
      <Button
        secondary
        title="Skis & tags"
        onPress={() => router.push("/gear")}
      />
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: "SpaceGrotesk_700Bold" }}
        >
          Login options
        </Text>
        <Text style={styles.muted}>
          Link another login to this account while you are signed in.
        </Text>
        {googleConfigured && (
          <Button
            secondary
            title="Link Google login"
            disabled={busy}
            onPress={() => void link("google")}
          />
        )}
        <Button
          secondary
          title="Link Apple login"
          disabled={busy}
          onPress={() => void link("apple")}
        />
      </Card>
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
      {Boolean(error) && <Notice error={error} />}
      <View style={styles.row}>
        <Button
          secondary
          title="Privacy"
          onPress={() => void Linking.openURL("https://shred.day/privacy")}
        />
        <Button
          secondary
          title="Support"
          onPress={() => void Linking.openURL("https://shred.day/support")}
        />
      </View>
      <Button
        title="Sign out"
        disabled={busy}
        onPress={() =>
          Alert.alert("Sign out?", undefined, [
            { text: "Cancel", style: "cancel" },
            { text: "Sign out", onPress: () => void run(auth.logout) },
          ])
        }
      />
      {!deleting ? (
        <Button
          destructive
          title="Delete account"
          disabled={busy}
          onPress={() => setDeleting(true)}
        />
      ) : (
        <Card>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: "SpaceGrotesk_700Bold" }}
          >
            Delete your account permanently
          </Text>
          <Text>
            Your days, photos, gear, tags and shared links will be removed. Sign
            in again to confirm.
          </Text>
          {auth.session?.authentication_method === "password" && (
            <Field
              label="Confirm password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
            />
          )}
          <Field
            label="Type DELETE to confirm"
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            destructive
            title="Confirm & delete account"
            busy={busy}
            disabled={
              confirmation !== "DELETE" ||
              (auth.session?.authentication_method === "password" && !password)
            }
            onPress={() => void destroy()}
          />
          <Button
            secondary
            title="Keep account"
            disabled={busy}
            onPress={() => {
              setDeleting(false);
              setConfirmation("");
              setPassword("");
            }}
          />
        </Card>
      )}
    </Screen>
  );
}
