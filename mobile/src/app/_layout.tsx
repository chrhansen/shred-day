import { Stack } from "expo-router";
import { ActivityIndicator, AppState, View } from "react-native";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../contexts/auth";
import { Button, colors, Screen, Text } from "../components/ui";
import { ApiError } from "../lib/api";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) =>
        !(
          error instanceof ApiError && [401, 404, 422].includes(error.status)
        ) && count < 2,
    },
    mutations: { retry: false },
  },
});
function Routes() {
  const { user, ready, error, retry, logout } = useAuth();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  if (error && !user)
    return (
      <Screen>
        <Text>{error}</Text>
        <Button title="Reconnect" onPress={retry} />
        <Button
          secondary
          title="Use another account"
          onPress={() => void logout()}
        />
      </Screen>
    );
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: "SpaceGrotesk_700Bold" },
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="log/index"
          options={{ title: "Log a day", presentation: "modal" }}
        />
        <Stack.Screen
          name="log/[id]"
          options={{ title: "Edit day", presentation: "modal" }}
        />
        <Stack.Screen name="day/[id]" options={{ title: "Your day" }} />
        <Stack.Screen name="gear" options={{ title: "Equipment & tags" }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="d/[id]" options={{ title: "Shared ski day" }} />
    </Stack>
  );
}
export default function RootLayout() {
  const [fonts, error] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => listener.remove();
  }, []);
  if (!fonts && !error)
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
