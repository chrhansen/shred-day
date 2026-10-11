import type { ExpoConfig } from "expo/config";
const bundleId = process.env.EXPO_PUBLIC_BUNDLE_ID || "day.shred.app";
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const config: ExpoConfig = {
  name: "Shred.Day",
  slug: "shred-day",
  owner: "chrhansen",
  version: "1.0.0",
  scheme: "shredday",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      ...(process.env.APP_ENV === "development"
        ? { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } }
        : {}),
    },
    associatedDomains: process.env.APPLE_TEAM_ID ? ["applinks:shred.day"] : [],
  },
  android: { package: bundleId },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-image",
    "expo-secure-store",
    "expo-apple-authentication",
    [
      "expo-image-picker",
      {
        photosPermission: "Choose photos to remember your ski days.",
        cameraPermission: "Take a photo for your ski-day log.",
        microphonePermission: false,
      },
    ],
    [
      "expo-build-properties",
      { ios: { deploymentTarget: "16.4", enableSceneSupport: true } },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F5F1E9",
        image: "./assets/icon.png",
        imageWidth: 140,
      },
    ],
    ...(googleIosClientId
      ? ([
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: googleIosClientId.split(".").reverse().join(".") },
          ],
        ] as NonNullable<ExpoConfig["plugins"]>)
      : []),
  ],
  extra: { eas: { projectId: "0153b518-9651-4b86-b878-795c8cc8ce11" } },
};
export default config;
