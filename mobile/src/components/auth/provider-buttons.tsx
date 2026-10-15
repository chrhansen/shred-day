import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import * as Apple from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import { Text, colors } from "../ui";
import { googleConfigured } from "../../lib/provider-login";

export type Provider = "apple" | "google";
export function ProviderButtons({ onPress, busy, compact = false, providers }: {
  onPress: (provider: Provider) => void; busy?: Provider | "email" | null; compact?: boolean; providers?: readonly Provider[];
}) {
  const [apple, setApple] = useState(false);
  useEffect(() => { void Apple.isAvailableAsync().then(setApple).catch(() => setApple(false)); }, []);
  return <View style={{ gap: 12, flexDirection: compact ? "row" : "column" }}>
    {apple && (!providers || providers.includes("apple")) && <View style={{ flex: compact ? 1 : undefined, opacity: busy ? 0.7 : 1 }}
      pointerEvents={busy ? "none" : "auto"} accessibilityState={{ busy: busy === "apple", disabled: Boolean(busy) }}>
      <Apple.AppleAuthenticationButton buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK} cornerRadius={12}
        style={{ height: compact ? 50 : 52, width: "100%" }} onPress={() => { if (!busy) onPress("apple"); }} />
      {busy === "apple" && <ActivityIndicator color="white" style={{ position: "absolute", left: 14, top: 16 }} />}
    </View>}
    {googleConfigured && (!providers || providers.includes("google")) && <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: Boolean(busy), busy: busy === "google" }} disabled={Boolean(busy)}
      onPress={() => onPress("google")} style={({ pressed }) => ({
        minHeight: compact ? 50 : 52, flex: compact ? 1 : undefined, padding: 12,
        borderRadius: 12, borderWidth: 1, borderColor: colors.googleBorder, backgroundColor: "white",
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
        opacity: pressed || busy ? 0.7 : 1,
      })}>
      {busy === "google" ? <ActivityIndicator color={colors.primary} /> : <GoogleMark />}
      <Text style={{ fontFamily: undefined, fontSize: 16, color: colors.googleText }}>
        {busy === "google" ? "Signing in…" : compact ? "Google" : "Continue with Google"}
      </Text>
    </Pressable>}
  </View>;
}
function GoogleMark() {
  return <Svg width={18} height={18} viewBox="0 0 262 262" accessible={false}>
    <Path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" />
    <Path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
    <Path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" />
    <Path fill="#EA4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
  </Svg>;
}
