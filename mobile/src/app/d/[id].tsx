import { useLocalSearchParams } from "expo-router";
import { DayDetail } from "../../components/day-detail";
export default function SharedDayScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const validId = typeof id === "string" && /^[A-Za-z0-9_-]+$/.test(id) ? id : "";
  return <DayDetail key={validId} id={validId} shared />;
}
