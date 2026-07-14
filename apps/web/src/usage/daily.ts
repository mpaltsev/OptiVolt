import type { HourUsage } from "./aggregate.js";

export type DayUsage = {
  year: number;
  month: number;
  day: number;
  kwh: number;
};

/** Fold sparse hours into daily kWh totals (for charts; not priced). */
export function hoursToDaily(hours: HourUsage[]): DayUsage[] {
  const buckets = new Map<string, DayUsage>();
  for (const hour of hours) {
    const key = `${hour.year}-${hour.month}-${hour.day}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.kwh += hour.kwh;
    } else {
      buckets.set(key, {
        year: hour.year,
        month: hour.month,
        day: hour.day,
        kwh: hour.kwh,
      });
    }
  }
  return [...buckets.values()].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });
}

/** Mid usage date vs catalog `as_of` — flag when more than `maxDays` apart. */
export function isUsageStale(
  hours: HourUsage[],
  catalogAsOf: string,
  maxDays = 120,
): boolean {
  if (hours.length === 0) return false;
  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const h of hours) {
    const ms = Date.UTC(h.year, h.month - 1, h.day);
    if (ms < minMs) minMs = ms;
    if (ms > maxMs) maxMs = ms;
  }
  const mid = (minMs + maxMs) / 2;
  const asOf = Date.parse(`${catalogAsOf}T12:00:00Z`);
  if (!Number.isFinite(asOf)) return false;
  return Math.abs(mid - asOf) > maxDays * 86_400_000;
}
