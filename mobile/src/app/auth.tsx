import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import * as Apple from "expo-apple-authentication";
import { useAuth } from "../contexts/auth";
import {
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Screen,
  Text,
  colors,
  styles,
} from "../components/ui";
import { googleConfigured } from "../lib/provider-login";
export default function AuthScreen() {
  const auth = useAuth();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  useEffect(() => {
    void Apple.isAvailableAsync().then(setApple);
  }, []);
  const perform = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      if ((cause as { code?: string }).code !== "ERR_REQUEST_CANCELED")
        setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <View style={{ height: 70 }} />
      <Heading
        title="Make every
day count."
        subtitle="The snow fades. The good days stay."
      />
      <Card style={{ backgroundColor: colors.alpine, borderWidth: 0 }}>
        <Text style={{ fontSize: 48, lineHeight: 56 }}>↗</Text>
        <Text style={styles.eyebrow}>A SEASON TO REMEMBER</Text>
        <Text>Your mountains. Your memories. Your ski-day log.</Text>
      </Card>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={register ? "new-password" : "current-password"}
      />
      {Boolean(error) && <Notice error={error} />}
      <Button
        title={register ? "Create account" : "Sign in"}
        busy={busy}
        disabled={!email.trim() || password.length < (register ? 8 : 1)}
        onPress={() =>
          void perform(() =>
            auth.passwordLogin(email.trim(), password, register),
          )
        }
      />
      {googleConfigured && (
        <Button
          title="Continue with Google"
          secondary
          disabled={busy}
          onPress={() => void perform(() => auth.socialLogin("google"))}
        />
      )}
      {apple && (
        <Apple.AppleAuthenticationButton
          buttonType={Apple.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={14}
          style={{ height: 50 }}
          onPress={() => {
            if (!busy) void perform(() => auth.socialLogin("apple"));
          }}
        />
      )}
      <Button
        title={
          register
            ? "Already have an account? Sign in"
            : "New here? Create an account"
        }
        secondary
        disabled={busy}
        onPress={() => {
          setRegister(!register);
          setError(null);
        }}
      />
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
    </Screen>
  );
}
