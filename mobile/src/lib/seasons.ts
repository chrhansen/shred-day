export function seasonDateRange(offset: number, cutoff = "09-01", now = new Date()) {
  const [month, day] = cutoff.split("-").map(Number);
  const apiToday = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startThisYear = new Date(apiToday.getFullYear(), month - 1, day);
  const startYear = startThisYear > apiToday ? apiToday.getFullYear() - 1 : apiToday.getFullYear();
  const start = new Date(startYear + offset, month - 1, day);
  const end = new Date(startYear + offset + 1, month - 1, day - 1);
  const format = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return { start, end, label: `${format(start)} – ${format(end)}` };
}
