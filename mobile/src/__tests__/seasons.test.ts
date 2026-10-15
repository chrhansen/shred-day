import { dateString } from "../lib/dates";
import { seasonDateRange } from "../lib/seasons";
import { initialSeasonDate } from "../lib/journal";

test.each([
  ["2026-09-01T00:30:00+02:00", 0, "09-01", "2025-09-01", "2026-08-31"],
  ["2026-09-01T00:30:00+02:00", -1, "09-01", "2024-09-01", "2025-08-31"],
  ["2026-08-31T18:30:00-07:00", 0, "09-01", "2026-09-01", "2027-08-31"],
  ["2026-08-31T18:30:00-07:00", -1, "09-01", "2025-09-01", "2026-08-31"],
  ["2026-10-15T00:30:00+02:00", 0, "10-15", "2025-10-15", "2026-10-14"],
])("season bounds match the API's UTC date at %s, offset %i", (instant, offset, cutoff, start, end) => {
  const range = seasonDateRange(Number(offset), cutoff, new Date(instant));
  expect(dateString(range.start)).toBe(start);
  expect(dateString(range.end)).toBe(end);
});

test("historical empty-season selection uses the same UTC reference", () => {
  expect(initialSeasonDate(-1, "09-01", new Date("2026-09-01T00:30:00+02:00"))).toBe("2024-09-01");
});

test("the current date preset still uses the user's local calendar date", () => {
  const now = new Date("2026-09-01T00:30:00+02:00");
  expect(initialSeasonDate(0, "09-01", now)).toBe(dateString(now));
});
