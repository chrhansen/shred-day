import { formatSkiDayDisplayDate } from "../dateDisplay";

describe("formatSkiDayDisplayDate", () => {
  const now = new Date(2024, 2, 21, 12, 0, 0); // Thu Mar 21 2024

  it("returns Today for the same calendar day", () => {
    expect(formatSkiDayDisplayDate(new Date(2024, 2, 21, 1), now)).toBe("Today");
  });

  it("returns Yesterday for one day difference", () => {
    expect(formatSkiDayDisplayDate(new Date(2024, 2, 20, 23), now)).toBe("Yesterday");
  });

  it("uses weekday names for the past 6 days", () => {
    expect(formatSkiDayDisplayDate(new Date(2024, 2, 19, 12), now)).toBe("Tuesday");
    expect(formatSkiDayDisplayDate(new Date(2024, 2, 15, 12), now)).toBe("Friday");
  });

  it("falls back to short date for older days in the same year", () => {
    expect(formatSkiDayDisplayDate(new Date(2024, 2, 14, 12), now)).toBe("Mar 14");
  });

  it("includes the year when the day is from a different year", () => {
    expect(formatSkiDayDisplayDate(new Date(2023, 11, 31, 12), now)).toBe("Dec 31, 2023");
  });

  it("returns a date for future days", () => {
    expect(formatSkiDayDisplayDate(new Date(2024, 2, 25, 12), now)).toBe("Mar 25");
  });
});
