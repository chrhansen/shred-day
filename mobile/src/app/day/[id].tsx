import { useLocalSearchParams } from "expo-router";
import { DayDetail } from "../../components/day-detail";
export default function DayScreen() {
  const { id, share } = useLocalSearchParams<{ id?: string; share?: string }>();
  const validId = typeof id === "string" && /^[A-Za-z0-9_-]+$/.test(id) ? id : "";
  return <DayDetail key={validId} id={validId} openSharing={share === "1"} />;
}
