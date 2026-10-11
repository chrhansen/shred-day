export const dateString = (value: Date) =>
  [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
export function parseDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
export const displayDate = (value: string) =>
  parseDay(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export const seasonLabel = (offset: number) =>
  offset > 0
    ? offset === 1
      ? "Next season"
      : offset + " seasons ahead"
    : offset === 0
      ? "This season"
      : offset === -1
        ? "Last season"
        : Math.abs(offset) + " seasons ago";
