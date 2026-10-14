import { getCalendars } from "expo-localization";
import { initialSeasonDate, localeWeekStart, relativeDay } from "../lib/journal";

jest.mock("expo-localization", () => ({ getCalendars: jest.fn() }));

test.each([[1, 0], [2, 1], [7, 6]])("calendar uses device first weekday %i as column %i", (firstWeekday, column) => {
  (getCalendars as jest.Mock).mockReturnValue([{ firstWeekday }]);
  expect(localeWeekStart()).toBe(column);
});

test("relative dates compare local calendar days across a daylight-saving boundary", () => {
  expect(relativeDay("2026-10-25", new Date(2026, 9, 26, 0, 30))).toBe("Yesterday");
});

test("historical empty seasons select the configured season start", () => {
  expect(initialSeasonDate(-1, "09-01", new Date(2026, 9, 14))).toBe("2025-09-01");
  expect(initialSeasonDate(-1, "09-01", new Date(2026, 2, 14))).toBe("2024-09-01");
});
