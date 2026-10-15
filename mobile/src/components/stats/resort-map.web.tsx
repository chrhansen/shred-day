import type { StatsResort } from "../../lib/season-charts";
import { MapFallback } from "./map-fallback";

export function ResortMap(_props: { resorts: readonly StatsResort[]; selected: number; onSelect: (index: number) => void }) {
  return <MapFallback />;
}
