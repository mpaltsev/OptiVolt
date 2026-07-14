import { describe, expect, it } from "vitest";
import type { TimeWindow } from "../catalog/types.js";
import type { HourUsage } from "../usage/aggregate.js";
import { WindowMatcher } from "./windows.js";

function hour(
  year: number,
  month: number,
  day: number,
  hourOfDay: number,
): HourUsage {
  return { year, month, day, hour: hourOfDay, kwh: 1 };
}

function window(
  partial: Partial<TimeWindow> & Pick<TimeWindow, "start" | "end">,
): TimeWindow {
  return {
    months: null,
    weekdays: null,
    rate_per_kwh: null,
    discount_pct: null,
    ...partial,
  };
}

describe("WindowMatcher", () => {
  it("maps midnight and end-of-day clocks", () => {
    const matcher = new WindowMatcher("sunday");
    expect(matcher.minutesFromClock("00:00")).toBe(0);
    expect(matcher.minutesFromClock("24:00")).toBe(1440);
    expect(matcher.minutesFromClock("07:30")).toBe(450);
  });

  it("indexes weekdays from local week_start", () => {
    // 2026-07-12 Sunday, 2026-07-13 Monday
    const israel = new WindowMatcher("sunday");
    expect(israel.weekdayIndex(2026, 7, 12)).toBe(0);
    expect(israel.weekdayIndex(2026, 7, 13)).toBe(1);

    const iso = new WindowMatcher("monday");
    expect(iso.weekdayIndex(2026, 7, 13)).toBe(0);
    expect(iso.weekdayIndex(2026, 7, 12)).toBe(6);
  });

  it("uses half-open same-day intervals", () => {
    const matcher = new WindowMatcher("sunday");
    const windows = [window({ start: "07:00", end: "20:00", discount_pct: 0 })];
    expect(matcher.match(windows, hour(2026, 7, 14, 7)).discount_pct).toBe(0);
    expect(matcher.match(windows, hour(2026, 7, 14, 19)).discount_pct).toBe(0);
    expect(() => matcher.match(windows, hour(2026, 7, 14, 20))).toThrow(
      /No matching window/,
    );
  });

  it("matches overnight wrap", () => {
    const matcher = new WindowMatcher("sunday");
    const windows = [
      window({ start: "06:00", end: "22:00", discount_pct: 0 }),
      window({ start: "22:00", end: "06:00", discount_pct: 10 }),
    ];
    expect(matcher.match(windows, hour(2026, 7, 14, 22)).discount_pct).toBe(10);
    expect(matcher.match(windows, hour(2026, 7, 14, 23)).discount_pct).toBe(10);
    expect(matcher.match(windows, hour(2026, 7, 14, 3)).discount_pct).toBe(10);
    expect(matcher.match(windows, hour(2026, 7, 14, 12)).discount_pct).toBe(0);
    expect(matcher.match(windows, hour(2026, 7, 14, 6)).discount_pct).toBe(0);
  });

  it("picks the first matching window when overlapping", () => {
    const matcher = new WindowMatcher("sunday");
    const windows = [
      window({ start: "00:00", end: "24:00", discount_pct: 5 }),
      window({ start: "00:00", end: "24:00", discount_pct: 99 }),
    ];
    expect(matcher.match(windows, hour(2026, 7, 14, 12)).discount_pct).toBe(5);
  });

  it("filters months and weekdays with sunday week_start (IL Sun-Thu)", () => {
    const matcher = new WindowMatcher("sunday");
    const windows = [
      window({
        start: "17:00",
        end: "23:00",
        months: [6, 7, 8, 9],
        weekdays: [0, 1, 2, 3, 4],
        rate_per_kwh: 0.55,
      }),
      window({
        start: "00:00",
        end: "24:00",
        rate_per_kwh: 0.38,
      }),
    ];
    // Monday 2026-07-13 → index 1 — peak
    expect(matcher.match(windows, hour(2026, 7, 13, 18)).rate_per_kwh).toBe(
      0.55,
    );
    // Sunday 2026-07-12 → index 0 — also workday peak under IL
    expect(matcher.match(windows, hour(2026, 7, 12, 18)).rate_per_kwh).toBe(
      0.55,
    );
    // Saturday 2026-07-11 → index 6 — weekend catch-all
    expect(matcher.match(windows, hour(2026, 7, 11, 18)).rate_per_kwh).toBe(
      0.38,
    );
    // January weekday — off season, catch-all
    expect(matcher.match(windows, hour(2026, 1, 5, 18)).rate_per_kwh).toBe(
      0.38,
    );
  });

  it("throws when no window matches", () => {
    const matcher = new WindowMatcher("monday");
    const windows = [window({ start: "10:00", end: "11:00" })];
    expect(() => matcher.match(windows, hour(2026, 7, 14, 9))).toThrow(
      /No matching window/,
    );
  });
});
