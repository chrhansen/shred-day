import { Tabs } from "expo-router";
import { Text, colors } from "../../components/ui";
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontFamily: "SpaceGrotesk_500Medium" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Days",
          tabBarIcon: ({ color }) => <Text style={{ color }}>◒</Text>,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Season",
          tabBarIcon: ({ color }) => <Text style={{ color }}>▥</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Text style={{ color }}>☷</Text>,
        }}
      />
    </Tabs>
  );
}
