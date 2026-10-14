import { Stack } from "expo-router";
import { ActivityIndicator, AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { AuthProvider, useAuth } from "../contexts/auth";
import { SeasonProvider } from "../contexts/season";
import { Button, Notice, Screen, Text, ToastProvider, colors, fonts } from "../components/ui";
import { Brand } from "../components/auth/brand";
import { ApiError } from "../lib/api";

const queryClient = new QueryClient({ defaultOptions: {
  queries: { staleTime: 30_000, retry: (count, error) => !(error instanceof ApiError && [401, 404, 422].includes(error.status)) && count < 2 },
  mutations: { retry: false },
} });
function Routes() {
  const { user, ready, error, retry, logout, deletionConfirmed } = useAuth();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: "center", alignItems: "center", gap: 20 }}>
    <Image source={require("../../assets/logo.png")} accessible={false} style={{ width: 84, height: 84 }} />
    <ActivityIndicator color={colors.indigo} /><Text variant="chip" style={{ color: colors.textSecondary }}>Restoring your session…</Text>
  </View>;
  if (error && !user) return <Screen edges={["top", "left", "right", "bottom"]}
    contentStyle={{ flexGrow: 1, padding: 24, gap: 20 }}>
    <Brand /><View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
      <Text variant="titleL" accessibilityRole="header">{"Let's reconnect"}</Text>
      <Notice message={error} />
    </View><Button title="Reconnect" onPress={retry} />
    <Button variant="secondary" title="Use Another Account" onPress={() => void logout()} />
  </Screen>;
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.primary,
    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink }, contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Protected guard={Boolean(user)}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="log/index" options={{ title: "Log Day", presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="log/[id]" options={{ title: "Edit Day", presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="day/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="gear" options={{ headerShown: false }} />
      <Stack.Screen name="settings/delete" options={{ title: "Delete Account", headerBackTitle: "Settings" }} />
    </Stack.Protected>
    <Stack.Protected guard={!user}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="auth/email" options={{ title: "", headerBackButtonDisplayMode: "minimal", headerShadowVisible: false }} />
    </Stack.Protected>
    <Stack.Protected guard={deletionConfirmed}>
      <Stack.Screen name="account-deleted" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack.Protected>
    <Stack.Screen name="d/[id]" options={{ headerShown: false, presentation: "modal" }} />
  </Stack>;
}
export default function RootLayout() {
  const [loaded, error] = useFonts({ SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold });
  useEffect(() => {
    const listener = AppState.addEventListener("change", state => focusManager.setFocused(state === "active"));
    return () => listener.remove();
  }, []);
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><StatusBar style="dark" />
    <QueryClientProvider client={queryClient}><AuthProvider><SeasonProvider><ToastProvider><Routes /></ToastProvider></SeasonProvider></AuthProvider></QueryClientProvider>
  </SafeAreaProvider></GestureHandlerRootView>;
}
