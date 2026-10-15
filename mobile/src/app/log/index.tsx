import { DayEditor } from "../../components/day-editor";
import { useLocalSearchParams } from "expo-router";
export default function NewDayScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <DayEditor initialDate={date} />;
}
