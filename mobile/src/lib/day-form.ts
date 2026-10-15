import { dateString, parseDay } from "./dates";
import type { Day, DayEntry, Resort } from "./types";

export type DayForm = {
  date: string;
  resort: Resort | null;
  skiIds: string[];
  tagIds: string[];
  notes: string;
};
export function emptyDayForm(today = new Date()): DayForm {
  return { date: dateString(today), resort: null, skiIds: [], tagIds: [], notes: "" };
}
export function formForDay(day: Day): DayForm {
  return { date: day.date, resort: day.resort, skiIds: day.skis.map((ski) => ski.id),
    tagIds: day.tags.map((tag) => tag.id), notes: day.notes || "" };
}
export function dayFormKey(form: DayForm, photoKeys: string[]) {
  return JSON.stringify([form.date, form.resort?.id || null, [...form.skiIds].sort(),
    [...form.tagIds].sort(), form.notes, [...photoKeys].sort()]);
}
export function seasonForDate(date: string, cutoff: string, today = new Date()) {
  const [month, day] = cutoff.split("-").map(Number);
  const value = parseDay(date);
  const yearFor = (input: Date) => input.getFullYear() -
    (input < new Date(input.getFullYear(), month - 1, day) ? 1 : 0);
  return yearFor(value) - yearFor(today);
}
export function projectedDayNumber(days: DayEntry[], date: string, id?: string) {
  return days.filter((day) => day.id !== id && day.date <= date).length + 1;
}
