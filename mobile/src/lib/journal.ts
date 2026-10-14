import { dateString, parseDay } from "./dates";
import { getCalendars } from "expo-localization";
import type { DayEntry } from "./types";

export function journalSections(days: readonly DayEntry[]) {
  const groups = new Map<string, DayEntry[]>();
  [...days].sort((a, b) => b.date.localeCompare(a.date) || b.day_number - a.day_number).forEach((day) => {
    const month = day.date.slice(0, 7);
    groups.set(month, [...(groups.get(month) || []), day]);
  });
  return [...groups].map(([month, data]) => ({
    month,
    title: parseDay(month + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    data,
  }));
}

export function journalSelection(days: readonly DayEntry[], fallback = dateString(new Date())) {
  return [...days].sort((a, b) => b.date.localeCompare(a.date))[0]?.date || fallback;
}

export function relativeDay(value: string, now = new Date()) {
  const day = parseDay(value);
  const difference = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())) / 86_400_000);
  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";
  return day.toLocaleDateString(undefined, difference > 1 && difference < 7
    ? { weekday: "long" } : { month: "short", day: "numeric" });
}

export const selectedDateTitle = (value: string) => parseDay(value).toLocaleDateString(undefined,
  { weekday: "long", month: "short", day: "numeric" });
export const detailDate = (value: string) => parseDay(value).toLocaleDateString(undefined,
  { weekday: "long", month: "short", day: "numeric", year: "numeric" });
export const monthStart = (value: string) => value.slice(0, 7) + "-01";

export function initialSeasonDate(offset: number, startDay: string, now = new Date()) {
  const [month, day] = startDay.split("-").map(Number);
  const valid = Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(day) && day >= 1 && day <= 31;
  const start = new Date(now.getFullYear(), valid ? month - 1 : 8, valid ? day : 1);
  if (now < start) start.setFullYear(start.getFullYear() - 1);
  start.setFullYear(start.getFullYear() + offset);
  return dateString(offset === 0 ? now : start);
}

export function localeWeekStart() {
  try {
    const firstWeekday = getCalendars()[0]?.firstWeekday;
    if (firstWeekday && firstWeekday >= 1 && firstWeekday <= 7) return firstWeekday - 1;
    const locale = new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale) as Intl.Locale & {
      weekInfo?: { firstDay: number }; getWeekInfo?: () => { firstDay: number };
    };
    return (locale.getWeekInfo?.().firstDay ?? locale.weekInfo?.firstDay ?? 7) % 7;
  } catch {
    return 0;
  }
}
