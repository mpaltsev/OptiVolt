import { describe, expect, it } from "vitest";
import { hoursToDaily, isUsageStale } from "./daily.js";
import type { HourUsage } from "./aggregate.js";

describe("hoursToDaily", () => {
  it("sums hours into sorted days", () => {
    const hours: HourUsage[] = [
      { year: 2026, month: 7, day: 15, hour: 1, kwh: 0.2 },
      { year: 2026, month: 7, day: 14, hour: 10, kwh: 1 },
      { year: 2026, month: 7, day: 14, hour: 11, kwh: 0.5 },
    ];
    expect(hoursToDaily(hours)).toEqual([
      { year: 2026, month: 7, day: 14, kwh: 1.5 },
      { year: 2026, month: 7, day: 15, kwh: 0.2 },
    ]);
  });
});

describe("isUsageStale", () => {
  it("flags usage far from catalog as_of", () => {
    const hours: HourUsage[] = [
      { year: 2020, month: 1, day: 1, hour: 0, kwh: 1 },
    ];
    expect(isUsageStale(hours, "2026-07-14")).toBe(true);
    expect(isUsageStale(hours, "2020-01-15", 120)).toBe(false);
  });
});
