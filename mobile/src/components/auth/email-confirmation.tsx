import { useState } from "react";
import { View } from "react-native";
import { Button, Notice, Text, colors } from "../ui";
import { shred } from "../../services/shred";
import { ApiError } from "../../lib/api";

export function EmailConfirmation({ email, initiallySent, disabled, onBack, onBusyChange }: {
  email: string; initiallySent: boolean; disabled: boolean; onBack: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const [sent, setSent] = useState(initiallySent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    if (busy || disabled) return;
    setBusy(true); onBusyChange(true); setError(null);
    try {
      await shred.requestEmailConfirmation(email);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 429
        ? "Please wait before requesting another confirmation link."
        : "Couldn't send a confirmation link. Check your connection and try again.");
    } finally { setBusy(false); onBusyChange(false); }
  };
  return <View style={{ gap: 20 }}>
    <Text variant="titleL" accessibilityRole="header">{sent ? "Check your email" : "Confirm your email"}</Text>
    <Text style={{ color: colors.textSecondary }}>{sent
      ? `If ${email} needs confirmation, a link is on its way. Check your inbox and spam folder.`
      : `Send a confirmation link to ${email} to finish setting up password sign-in.`}</Text>
    <Text style={{ color: colors.textSecondary }}>Open the link, confirm your email and set your password. Then return here to log in.</Text>
    {error && <Notice message={error} tone="error" />}
    <Button title={sent ? "Resend confirmation link" : "Send confirmation link"} busy={busy} disabled={disabled && !busy} onPress={() => void send()} />
    <Button title="Back to Log In" variant="secondary" disabled={busy || disabled} onPress={onBack} />
  </View>;
}
