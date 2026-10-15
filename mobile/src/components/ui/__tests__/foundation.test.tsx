import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import { Calendar } from "../calendar";
import { SeasonProvider, useSeason } from "../../../contexts/season";

let mockAccountId = "account-a";
jest.mock("../../../contexts/auth", () => ({ useAuth: () => ({ user: { id: mockAccountId } }) }));

function SeasonConsumer({ name }: { name: string }) {
  const { season, setSeason } = useSeason();
  return <View><Text>{name}: {season}</Text><Pressable accessibilityLabel={"Previous " + name}
    onPress={() => setSeason(-1)}><Text>Change</Text></Pressable></View>;
}
test("Days and Season share selection and a new account starts in its own current season", () => {
  const tree = <SeasonProvider><SeasonConsumer name="Days" /><SeasonConsumer name="Season" /></SeasonProvider>;
  const screen = render(tree);
  fireEvent.press(screen.getByLabelText("Previous Days"));
  expect(screen.getByText("Days: -1")).toBeTruthy();
  expect(screen.getByText("Season: -1")).toBeTruthy();
  mockAccountId = "account-b";
  screen.rerender(<SeasonProvider><SeasonConsumer name="Days" /><SeasonConsumer name="Season" /></SeasonProvider>);
  expect(screen.getByText("Days: 0")).toBeTruthy();
  expect(screen.getByText("Season: 0")).toBeTruthy();
});
test("calendar month navigation crosses years and selections remain local calendar dates", () => {
  const change = jest.fn(), select = jest.fn();
  const screen = render(<Calendar month="2026-01-01" selected="2026-01-14"
    loggedDates={["2026-01-15"]} onMonthChange={change} onSelect={select} />);
  fireEvent.press(screen.getByLabelText("Previous month"));
  expect(change).toHaveBeenLastCalledWith("2025-12-01");
  fireEvent.press(screen.getByLabelText("Next month"));
  expect(change).toHaveBeenLastCalledWith("2026-02-01");
  fireEvent.press(screen.getByText("15"));
  expect(select).toHaveBeenCalledWith("2026-01-15");
  expect(screen.getByRole("button", { name: /^(?!.*no logged day).*logged day$/ })).toBeTruthy();
});
