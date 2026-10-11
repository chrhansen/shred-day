import * as Apple from "expo-apple-authentication";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { shred } from "../services/shred";
import type { ProviderProof } from "./types";
export const googleConfigured = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID &&
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
);
export async function providerProof(
  provider: "google" | "apple",
): Promise<ProviderProof> {
  if (provider === "google") {
    if (!googleConfigured) throw new Error("Google sign-in is unavailable.");
    GoogleSignin.configure({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
    await GoogleSignin.signOut();
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result) || !result.data.idToken)
      throw new Error("Sign-in canceled.");
    return { provider, identity_token: result.data.idToken };
  }
  const challenge = await shred.challenge();
  const result = await Apple.signInAsync({
    requestedScopes: [
      Apple.AppleAuthenticationScope.EMAIL,
      Apple.AppleAuthenticationScope.FULL_NAME,
    ],
    nonce: challenge.nonce,
  });
  if (!result.identityToken || !result.authorizationCode)
    throw new Error("Sign-in canceled.");
  return {
    provider,
    identity_token: result.identityToken,
    authorization_code: result.authorizationCode,
    challenge_id: challenge.id,
  };
}
