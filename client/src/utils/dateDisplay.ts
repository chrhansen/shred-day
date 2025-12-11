import { differenceInCalendarDays, format, getYear } from "date-fns";

const PAST_RELATIVE_WINDOW_DAYS = 6;

export const formatSkiDayDisplayDate = (dayDate: Date, now: Date = new Date()): string => {
  const difference = differenceInCalendarDays(now, dayDate);

  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";
  if (difference > 1 && difference <= PAST_RELATIVE_WINDOW_DAYS) {
    return format(dayDate, "EEEE");
  }

  const currentYear = getYear(now);
  return getYear(dayDate) === currentYear
    ? format(dayDate, "MMM d")
    : format(dayDate, "MMM d, yyyy");
};
