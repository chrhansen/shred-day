import { Stack } from "expo-router";
import { colors, fonts } from "../../../theme";

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.primary,
    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
    headerBackTitleStyle: { fontFamily: fonts.medium }, headerBackButtonDisplayMode: "default", contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="profile" options={{ title: "Profile", headerBackTitle: "Settings" }} />
    <Stack.Screen name="logins" options={{ title: "Sign-in methods", headerBackTitle: "Settings" }} />
    <Stack.Screen name="gear" options={{ title: "Skis & Tags", headerBackTitle: "Settings" }} />
  </Stack>;
}
