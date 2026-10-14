import { fireEvent, render } from "@testing-library/react-native";
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
