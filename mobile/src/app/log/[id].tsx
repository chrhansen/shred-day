import { useLocalSearchParams } from "expo-router";
import { DayEditor } from "../../components/day-editor";
export default function EditDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DayEditor id={id} />;
}
