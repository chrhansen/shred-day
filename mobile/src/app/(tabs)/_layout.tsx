import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, Icon } from "../../components/ui";
import { fonts, layout, type } from "../../theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const contentHeight = Math.max(layout.tabBarContentHeight, 34 + Math.ceil(type.tab.lineHeight * fontScale));
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle: { height: contentHeight + Math.max(insets.bottom, 8),
      backgroundColor: colors.tabBarBg, borderTopColor: colors.border, borderTopWidth: 1,
      paddingTop: 5, paddingBottom: Math.max(insets.bottom, 8) },
    tabBarLabelStyle: { ...type.tab, fontFamily: fonts.medium },
    tabBarItemStyle: { minHeight: 44 },
    tabBarBackground: () => Platform.OS === "ios" ?
      <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} /> : null,
  }}>
    <Tabs.Screen name="index" options={{ title: "Days", tabBarIcon: ({ color }) => <Icon name="book-open" size={24} color={color} /> }} />
    <Tabs.Screen name="stats" options={{ title: "Season", tabBarIcon: ({ color }) => <Icon name="chart" size={24} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <Icon name="settings" size={24} color={color} /> }} />
  </Tabs>;
}
