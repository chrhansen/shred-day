import { fireEvent, render, within } from "@testing-library/react-native";
import * as Native from "react-native";
import { Calendar } from "../components/ui/calendar";

const props = { month: "2026-10-01", selected: "2026-10-11", loggedDates: ["2026-10-11"],
  onMonthChange: jest.fn(), onSelect: jest.fn() };
const reactNative = jest.requireActual<typeof Native>("react-native");
let dimensions: jest.SpyInstance;
let gestures: jest.SpyInstance;
const deviceDimensions = { width: 375, height: 667, scale: 2, fontScale: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  dimensions = jest.spyOn(reactNative, "useWindowDimensions").mockReturnValue(deviceDimensions);
  gestures = jest.spyOn(Native.PanResponder, "create");
});
afterEach(() => jest.restoreAllMocks());

function measure(view: ReturnType<typeof render>, width: number) {
  fireEvent(view.getByTestId("calendar"), "layout", { nativeEvent: { layout: { width, height: 400, x: 0, y: 0 } } });
}
function dateCells(view: ReturnType<typeof render>) {
  return view.getAllByRole("button").filter((cell) => cell.props.accessibilityLabel.endsWith("logged day"));
}
function dateCell(view: ReturnType<typeof render>, day: number) {
  const cell = view.getAllByRole("button").find((button) => within(button).queryByText(String(day)));
  if (!cell) throw new Error(`Calendar date ${day} not found`);
  return cell;
}

test.each([343, 358])("seven calendar columns fit their measured %ipt parent", (width) => {
  const view = render(<Calendar {...props} />);
  measure(view, width);
  expect(Native.StyleSheet.flatten(view.getByTestId("calendar-grid").props.style).width).toBe(width);
  const cells = dateCells(view);
  expect(cells).toHaveLength(31);
  for (const cell of cells) {
    const style = Native.StyleSheet.flatten(cell.props.style);
    expect(style.width).toBeCloseTo(width / 7);
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  }
  fireEvent.press(cells[10]);
  expect(props.onSelect).toHaveBeenCalledWith("2026-10-11");
});

test("the grid follows a changed parent without using the window width", () => {
  const view = render(<Calendar {...props} />);
  measure(view, 343);
  measure(view, 358);
  expect(Native.StyleSheet.flatten(view.getByTestId("calendar-grid").props.style).width).toBe(358);
  expect(Native.StyleSheet.flatten(dateCells(view)[0].props.style).width).toBeCloseTo(358 / 7);
});

test("large fonts preserve touch columns and use horizontal overflow instead of month swiping", () => {
  dimensions.mockReturnValue({ ...deviceDimensions, fontScale: 3 });
  const view = render(<Calendar {...props} />);
  measure(view, 343);
  const grid = view.getByTestId("calendar-grid");
  const width = Native.StyleSheet.flatten(grid.props.style).width;
  expect(width).toBe(546);
  expect(width).toBeGreaterThan(343);
  for (const cell of dateCells(view)) {
    const style = Native.StyleSheet.flatten(cell.props.style);
    expect(style.width).toBeGreaterThanOrEqual(78);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  }
  const scroller = view.UNSAFE_getByType(Native.ScrollView);
  expect(scroller.props.horizontal).toBe(true);
  expect(scroller.props.scrollEnabled).toBe(true);
  const gesture = gestures.mock.calls.at(-1)![0];
  expect(gesture.onMoveShouldSetPanResponder({}, { dx: 60, dy: 0 })).toBe(false);
  fireEvent.press(view.getByLabelText("Next month"));
  expect(props.onMonthChange).toHaveBeenCalledWith("2026-11-01");
});

test.each([
  ["2026-09-01", "Previous month", "Next month", "2026-10-01"],
  ["2027-08-01", "Next month", "Previous month", "2027-07-01"],
])("month arrows stay within the date range from %s", (month, blocked, allowed, target) => {
  const view = render(<Calendar {...props} month={month} minDate="2026-09-01" maxDate="2027-08-31" />);
  expect(view.getByLabelText(blocked).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(view.getByLabelText(blocked));
  expect(props.onMonthChange).not.toHaveBeenCalled();
  expect(view.getByLabelText(allowed).props.accessibilityState.disabled).toBe(false);
  fireEvent.press(view.getByLabelText(allowed));
  expect(props.onMonthChange).toHaveBeenCalledWith(target);
});

test("partly available adjacent months remain reachable", () => {
  const view = render(<Calendar {...props} minDate="2026-09-15" maxDate="2026-11-15" />);
  fireEvent.press(view.getByLabelText("Previous month"));
  fireEvent.press(view.getByLabelText("Next month"));
  expect(props.onMonthChange.mock.calls).toEqual([["2026-09-01"], ["2026-11-01"]]);
});

test("horizontal month swipes share the boundary guards", () => {
  const view = render(<Calendar {...props} minDate="2026-10-01" maxDate="2026-11-30" />);
  measure(view, 343);
  let gesture = gestures.mock.calls.at(-1)![0];
  gesture.onPanResponderRelease({}, { dx: 70 });
  expect(props.onMonthChange).not.toHaveBeenCalled();
  gesture.onPanResponderRelease({}, { dx: -70 });
  expect(props.onMonthChange).toHaveBeenCalledWith("2026-11-01");
  props.onMonthChange.mockClear();
  view.rerender(<Calendar {...props} month="2026-11-01" minDate="2026-10-01" maxDate="2026-11-30" />);
  gesture = gestures.mock.calls.at(-1)![0];
  gesture.onPanResponderRelease({}, { dx: -70 });
  expect(props.onMonthChange).not.toHaveBeenCalled();
  gesture.onPanResponderRelease({}, { dx: 70 });
  expect(props.onMonthChange).toHaveBeenCalledWith("2026-10-01");
});

test("partial boundary months disable unavailable dates without claiming no logged day", () => {
  const view = render(<Calendar {...props} selected="2026-10-09" loggedDates={["2026-10-09"]}
    minDate="2026-10-10" maxDate="2026-10-20" />);
  for (const day of [9, 21]) {
    const cell = dateCell(view, day);
    expect(cell.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true, selected: false }));
    expect(cell.props.accessibilityLabel).toContain(", unavailable");
    expect(cell.props.accessibilityLabel).not.toContain("logged day");
    fireEvent.press(cell);
  }
  expect(props.onSelect).not.toHaveBeenCalled();
  for (const day of [10, 20]) {
    const cell = dateCell(view, day);
    expect(cell.props.accessibilityState.disabled).toBeFalsy();
    fireEvent.press(cell);
  }
  expect(props.onSelect.mock.calls).toEqual([["2026-10-10"], ["2026-10-20"]]);
});

test("editors without date bounds can navigate and choose any displayed day", () => {
  const view = render(<Calendar {...props} />);
  for (const label of ["Previous month", "Next month"]) {
    expect(view.getByLabelText(label).props.accessibilityState.disabled).toBe(false);
    fireEvent.press(view.getByLabelText(label));
  }
  expect(props.onMonthChange.mock.calls).toEqual([["2026-09-01"], ["2026-11-01"]]);
  for (const day of [1, 31]) {
    const cell = dateCell(view, day);
    expect(cell.props.accessibilityState.disabled).toBeFalsy();
    fireEvent.press(cell);
  }
  expect(props.onSelect.mock.calls).toEqual([["2026-10-01"], ["2026-10-31"]]);
});

test.each([
  ["2026-10-01", undefined, "Previous month", "Next month", "2026-11-01"],
  [undefined, "2026-10-31", "Next month", "Previous month", "2026-09-01"],
])("either date bound can be supplied alone", (minDate, maxDate, blocked, allowed, target) => {
  const view = render(<Calendar {...props} minDate={minDate} maxDate={maxDate} />);
  fireEvent.press(view.getByLabelText(blocked!));
  expect(props.onMonthChange).not.toHaveBeenCalled();
  fireEvent.press(view.getByLabelText(allowed!));
  expect(props.onMonthChange).toHaveBeenCalledWith(target);
});
