import { format, addYears, subDays } from 'date-fns';

/**
 * Converts a numeric season offset to a human-readable display string.
 * 0 -> "This Season"
 * -1 -> "Last Season"
 * -2 -> "2 Seasons Ago"
 */
export const getSeasonDisplayName = (seasonOffset: number): string => {
  if (seasonOffset === 0) return "This Season";
  if (seasonOffset === -1) return "Last Season";

  return `${Math.abs(seasonOffset)} Seasons Ago`;
};

/**
 * Calculates the start and end date for a given season offset and the user's season start day preference.
 * @param seasonOffset Numeric offset (0 for current, -1 for last, etc.)
 * @param seasonStartDay User's preferred season start, e.g., "09-01" (Month-Day)
 * @returns Object with startDate and endDate as Date objects
 */
export const getSeasonDateObjects = (seasonOffset: number, seasonStartDay: string): { startDate: Date, endDate: Date } => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  const [startMonthStr, startDayStr] = seasonStartDay.split('-');
  const startMonth = parseInt(startMonthStr, 10); // 1-indexed month from preference
  const startDayOfMonth = parseInt(startDayStr, 10);

  let currentSeasonStartYear;
  // If current date is before this year's season start date, current season started last year
  if (currentMonth < startMonth - 1 || (currentMonth === startMonth - 1 && currentDay < startDayOfMonth)) {
    currentSeasonStartYear = currentYear - 1;
  } else {
    currentSeasonStartYear = currentYear;
  }

  const targetSeasonStartYear = currentSeasonStartYear + seasonOffset;

  const startDate = new Date(targetSeasonStartYear, startMonth - 1, startDayOfMonth); // Month is 0-indexed for Date constructor
  const endDate = subDays(addYears(startDate, 1), 1);

  return { startDate, endDate };
};

/**
 * Returns a formatted date range string for a given season offset.
 * e.g., "2023 Sep. 1 - 2024 Aug. 31"
 */
export const getFormattedSeasonDateRange = (seasonOffset: number, seasonStartDay: string): string => {
  const { startDate, endDate } = getSeasonDateObjects(seasonOffset, seasonStartDay);
  return `${format(startDate, "yyyy MMM. d")} - ${format(endDate, "yyyy MMM. d")}`;
};
