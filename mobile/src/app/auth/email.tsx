import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/auth";
import { Button, Field, IconButton, Notice, Screen, Segmented, Text, colors } from "../../components/ui";
import { LegalLinks } from "../../components/auth/brand";
import { ProviderButtons, type Provider } from "../../components/auth/provider-buttons";
import { emailValidation, providerSignInNotice } from "../../lib/auth-presentation";
import { ApiError } from "../../lib/api";

export default function EmailAuthScreen() {
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode === "signup" ? "signup" : "login");
  const [email, setEmail] = useState(auth.expiredIdentity?.email || "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<Provider | "email" | null>(null);
  const [notice, setNotice] = useState<{ message: string; canceled: boolean } | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const validation = emailValidation(email, password, mode === "signup");
  const perform = async (provider?: Provider) => {
    if (busy) return;
    setNotice(null);
    if (!provider) { setTried(true); const errors = emailValidation(email, password, mode === "signup"); if (errors.email || errors.password) return; }
    setBusy(provider || "email");
    try {
      if (provider) await auth.socialLogin(provider);
      else await auth.passwordLogin(email.trim(), password, mode === "signup");
    } catch (cause) {
      if (provider) setNotice(providerSignInNotice(cause, provider));
      else setNotice({ canceled: false, message: cause instanceof ApiError && cause.status === 401 ? "That email and password don't match. Try again."
        : mode === "signup" && cause instanceof ApiError && cause.status === 422 ? "Couldn't create this account. Check your details or try logging in."
        : "Couldn't sign in. Check your connection and try again." });
    } finally { setBusy(null); }
  };
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <Screen edges={["left", "right", "bottom"]} contentInsetAdjustmentBehavior="never"
      contentStyle={{ paddingHorizontal: 24, paddingTop: 8, gap: 20, flexGrow: 1 }}>
      <View style={{ gap: 6 }}><Text variant="titleL" accessibilityRole="header">{mode === "login" ? "Welcome back" : "Create your account"}</Text>
        <Text style={{ color: colors.textSecondary }}>{mode === "login" ? "Log in to your ski journal." : "Start logging your ski days."}</Text></View>
      <Segmented gradient value={mode} onChange={next => { if (!busy) { setMode(next); setTried(false); setNotice(null); } }}
        options={[{ value: "login", label: "Log In", icon: "login" }, { value: "signup", label: "Sign Up", icon: "user-plus" }]} />
      {notice && <Notice message={notice.message} tone={notice.canceled ? "neutral" : "error"} />}
      <Field label="Email" icon="mail" value={email} onChangeText={setEmail} error={tried ? validation.email : undefined}
        readOnly={Boolean(busy)} placeholder="you@email.com" autoComplete="email" keyboardType="email-address"
        autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Field label="Password" icon="lock" value={password} onChangeText={setPassword} error={tried ? validation.password : undefined}
        readOnly={Boolean(busy)} placeholder="Password" secureTextEntry={!show} autoCapitalize="none" autoCorrect={false}
        autoComplete={mode === "signup" ? "new-password" : "current-password"} textContentType={mode === "signup" ? "newPassword" : "password"}
        returnKeyType="go" onSubmitEditing={() => void perform()} inputRef={passwordRef}
        helper={mode === "signup" ? "At least 8 characters." : undefined}
        trailing={<IconButton name={show ? "eye-off" : "eye"} accessibilityLabel={show ? "Hide password" : "Show password"}
          disabled={Boolean(busy)} size={18} color={colors.textMuted} onPress={() => setShow(!show)} />} />
      <Button title={busy === "email" ? "Logging in…" : mode === "signup" ? "Create Account" : "Log In"}
        busy={busy === "email"} disabled={Boolean(busy && busy !== "email")} onPress={() => void perform()} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text variant="small" style={{ color: colors.textMuted, letterSpacing: 1 }}>OR</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      <ProviderButtons compact busy={busy} onPress={provider => void perform(provider)} />
      <View style={{ flex: 1 }} /><LegalLinks />
    </Screen>
  </KeyboardAvoidingView>;
}
