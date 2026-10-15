import { fireEvent, render } from "@testing-library/react-native";
import { MonthBars } from "../month-bars";
import { TagDonut } from "../breakdowns";
import { ResortMapCard } from "../resort-map-card";
import { Circle } from "react-native-svg";
import { busiestMonth, mappedResorts, seasonMonths, tagSegments } from "../../../lib/season-charts";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("../resort-map", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return { ResortMap: ({ resorts, onSelect }: { resorts: unknown[]; onSelect: (index: number) => void }) =>
    <Pressable accessibilityLabel="Select last resort" onPress={() => onSelect(resorts.length - 1)}><Text>Map</Text></Pressable> };
});
const months = seasonMonths([{ month: "Dec", days: 7 }, { month: "Jan", days: 9 }, { month: "Feb", days: 9 }], "2025-09-01");
test("season month chart follows a custom cutoff, preserves zero months and picks the first busiest tie", () => {
  expect(months).toHaveLength(12);
  expect(months.map((month) => month.key)).toEqual(["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]);
  expect(months[0].days).toBe(0);
  expect(months[busiestMonth(months)].key).toBe("Jan");
  expect(seasonMonths([{ month: "Jan", days: 3 }], "2026-03-15")[0].key).toBe("Mar");
});
test("chart selection works through chart touch, VoiceOver adjustment and full-sized month sheet", () => {
  const screen = render(<MonthBars months={months} />);
  expect(screen.getByRole("button", { name: "January, 9 days. Choose month" })).toBeTruthy();
  const chart = screen.getByRole("adjustable");
  fireEvent(chart, "layout", { nativeEvent: { layout: { width: 300 } } });
  fireEvent.press(chart, { nativeEvent: { locationX: 75 } });
  expect(screen.getByRole("button", { name: "December, 7 days. Choose month" })).toBeTruthy();
  fireEvent(chart, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  fireEvent.press(screen.getByRole("button", { name: "January, 9 days. Choose month" }));
  fireEvent.press(screen.getByRole("radio", { name: "February, 9 days" }));
  expect(screen.getByRole("button", { name: "February, 9 days. Choose month" })).toBeTruthy();
});
test("tag chart calculates association shares and legend toggles independent selected states", () => {
  const tags = [{ name: "Powder", count: 3 }, { name: "Touring", count: 1 }];
  expect(tagSegments(tags).map((tag) => tag.percentage)).toEqual([75, 25]);
  expect(tagSegments([])).toEqual([]);
  const screen = render(<TagDonut tags={tags} />);
  const powder = screen.getByRole("button", { name: "Powder, 3 days, 75%" });
  fireEvent.press(powder);
  expect(screen.getByRole("button", { name: "Powder, 3 days, 75%", selected: true })).toBeTruthy();
  fireEvent.press(powder);
  expect(screen.getByRole("button", { name: "Powder, 3 days, 75%", selected: false })).toBeTruthy();
});
test("only valid provided resort locations reach the native map; zero coordinates remain valid", () => {
  const resorts = [
    { name: "Valid", latitude: 0, longitude: 0, daysSkied: 1 },
    { name: "Missing", latitude: null, longitude: 2, daysSkied: 1 },
    { name: "Invalid", latitude: 95, longitude: 20, daysSkied: 1 },
  ];
  expect(mappedResorts(resorts).map((resort) => resort.name)).toEqual(["Valid"]);
});

test("removing a selected tag through a refresh restores surviving slice visibility", () => {
  const screen = render(<TagDonut tags={[{ name: "Powder", count: 3 }, { name: "Touring", count: 1 }]} />);
  fireEvent.press(screen.getByRole("button", { name: "Touring, 1 day, 25%" }));
  screen.rerender(<TagDonut tags={[{ name: "Powder", count: 3 }]} />);
  expect(screen.UNSAFE_getAllByType(Circle).find((circle) => circle.props.r === 61)!.props.opacity).toBe(1);
  expect(screen.getByRole("button", { name: "Powder, 3 days, 100%", selected: false })).toBeTruthy();
});

test("map selection keeps the same resort across reorder and falls back when it is removed", () => {
  const first = { name: "Sölden", latitude: 46.9, longitude: 11, daysSkied: 2 };
  const last = { name: "Hintertux", latitude: 47.1, longitude: 11.6, daysSkied: 1 };
  const screen = render(<ResortMapCard resorts={[first, last]} />);
  fireEvent.press(screen.getByLabelText("Select last resort"));
  expect(screen.getByText(last.name)).toBeTruthy();
  screen.rerender(<ResortMapCard resorts={[last, first]} />);
  expect(screen.getByText(last.name)).toBeTruthy();
  screen.rerender(<ResortMapCard resorts={[first]} />);
  expect(screen.getByText(first.name)).toBeTruthy();
});
