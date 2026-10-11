import { useLocalSearchParams } from "expo-router";
import { DayDetail } from "../../components/day-detail";
export default function SharedDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DayDetail id={id} shared />;
}
