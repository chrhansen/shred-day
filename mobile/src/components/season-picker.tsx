import { ScrollView } from "react-native";
import { Pill } from "./ui";
import { seasonLabel } from "../lib/dates";
import { useAuth } from "../contexts/auth";
export function SeasonPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const { user } = useAuth();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {Array.from(new Set([0, ...(user?.available_seasons || [])]))
        .sort((a, b) => b - a)
        .map((offset) => (
          <Pill
            key={offset}
            title={seasonLabel(offset)}
            selected={value === offset}
            onPress={() => onChange(offset)}
          />
        ))}
    </ScrollView>
  );
}
