import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyGearScreen() {
  const { kind, tab } = useLocalSearchParams<{ kind?: string; tab?: string }>();
  return <Redirect href={{ pathname: "/settings/gear", params: { kind: kind || tab || "skis" } }} />;
}
