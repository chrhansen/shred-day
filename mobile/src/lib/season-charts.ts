import { colors } from "../theme";
import type { SeasonStats } from "./types";

const monthKeys = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export type MonthPoint = { key: string; name: string; label: string; days: number };
export function seasonMonths(data: SeasonStats["daysPerMonth"], startDate: string): MonthPoint[] {
  const startMonth = Number(startDate.slice(5, 7)) - 1;
  const first = Number.isInteger(startMonth) && startMonth >= 0 && startMonth < 12 ? startMonth : 8;
  const counts = new Map(data.map((item) => [item.month.toLowerCase().slice(0, 3), item.days]));
  return Array.from({ length: 12 }, (_, index) => {
    const month = (first + index) % 12;
    const date = new Date(2020, month, 1);
    return { key: monthKeys[month], name: date.toLocaleDateString(undefined, { month: "long" }),
      label: date.toLocaleDateString(undefined, { month: "narrow" }),
      days: Math.max(0, counts.get(monthKeys[month].toLowerCase()) ?? 0) };
  });
}
export function busiestMonth(months: readonly MonthPoint[]) {
  return months.reduce((best, item, index) => item.days > months[best].days ? index : best, 0);
}
export function monthBarHeight(days: number, maximum: number) {
  return days > 0 ? Math.max(6, maximum > 0 ? days / maximum * 120 : 6) : 2;
}
export function tagSegments(data: SeasonStats["tags"]) {
  const tags = data.filter((tag) => tag.count > 0);
  const total = tags.reduce((sum, tag) => sum + tag.count, 0);
  let start = 0;
  return tags.map((tag, index) => {
    const fraction = tag.count / total;
    const entry = { ...tag, fraction, start, percentage: Math.round(fraction * 100),
      color: colors.tag[tag.name as keyof typeof colors.tag] ?? colors.tagFallback[index % colors.tagFallback.length] };
    start += fraction;
    return entry;
  });
}
export type StatsResort = SeasonStats["resorts"][number] & { country?: string | null };
export function mappedResorts(resorts: readonly StatsResort[]) {
  return resorts.filter((resort): resort is StatsResort & { latitude: number; longitude: number } =>
    typeof resort.latitude === "number" && typeof resort.longitude === "number" &&
    Number.isFinite(resort.latitude) && Number.isFinite(resort.longitude) &&
    Math.abs(resort.latitude) <= 90 && Math.abs(resort.longitude) <= 180);
}
