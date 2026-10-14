import { useState } from "react";
import { View } from "react-native";
import { useAuth } from "../../contexts/auth";
import { signInCanceled } from "../../lib/auth-presentation";
import { ApiError } from "../../lib/api";
import { BottomSheet, Button, Field, Notice, Text, colors } from "../ui";
import { ProviderButtons, type Provider } from "../auth/provider-buttons";

type ReauthProps = {
  visible: boolean; onClose: () => void; reason: string; action: string; destructive?: boolean;
  operationProvider?: Provider; onConfirmed: () => Promise<boolean | void>;
};
export function ReauthSheet(props: ReauthProps) {
  return props.visible ? <ReauthContent {...props} /> : null;
}
function ReauthContent({ visible, onClose, reason, action, destructive, operationProvider, onConfirmed }: ReauthProps) {
  const auth = useAuth();
  const method = auth.reauthenticationMethod;
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [notice, setNotice] = useState<{ message: string; canceled: boolean } | null>(null);
  const submit = async () => {
    if (busy || (method === "password" && !password)) return;
    setBusy(true); setNotice(null); setPasswordError(undefined);
    let stage: "proof" | "operation" = "proof";
    try {
      await auth.reauthenticate(password); stage = "operation";
      const completed = await onConfirmed();
      if (completed !== false) { setPassword(""); onClose(); }
    } catch (cause) {
      if (stage === "proof" && method === "password" && cause instanceof ApiError && cause.status === 401)
        setPasswordError("That password isn't right. Try again.");
      else {
        const canceled = signInCanceled(cause);
        const provider = stage === "operation" ? operationProvider : method;
        setNotice({ canceled, message: canceled
          ? `${provider === "apple" ? "Apple" : "Google"} sign-in was canceled. Nothing was changed.`
          : cause instanceof Error && cause.message === "Use the sign-in connected to this account."
            ? "Use a sign-in already connected to this account."
            : "Couldn't confirm your sign-in. Check your connection and try again." });
      }
    } finally { setBusy(false); }
  };
  return <BottomSheet visible={visible} onClose={onClose} title="Confirm it's you" dismissible={!busy}>
    <Text variant="footnote" style={{ color: colors.textSecondary }}>{reason}</Text>
    {notice && <Notice tone={notice.canceled ? "neutral" : "error"} message={notice.message} />}
    {method === "password" ? <>
      <Field label={`Password for ${auth.user?.email || "your account"}`} value={password}
        onChangeText={setPassword} secureTextEntry autoFocus autoCapitalize="none" autoCorrect={false}
        autoComplete="current-password" textContentType="password" readOnly={busy} error={passwordError}
        returnKeyType="go" onSubmitEditing={() => void submit()} />
      <Button title={busy ? "Confirming…" : action} variant={destructive ? "destructive" : "primary"}
        busy={busy} disabled={!password} onPress={() => void submit()} />
    </> : <View style={{ gap: 12 }}>
      <Text variant="caption" style={{ color: colors.textSecondary }}>
        Continue with the {method === "google" ? "Google" : "Apple"} sign-in you already use for this journal.
      </Text>
      <ProviderButtons providers={[method]} busy={busy ? method : null} onPress={() => void submit()} />
      {busy && <Text variant="caption" accessibilityLiveRegion="polite">Confirming your sign-in…</Text>}
    </View>}
    <Button title="Cancel" variant="text" disabled={busy} onPress={onClose} />
  </BottomSheet>;
}
