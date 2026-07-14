import { describe, expect, it } from "vitest";
import { UsageAggregator, type Pulse } from "./aggregate.js";

function pulse(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  kwhImport: number,
): Pulse {
  return { year, month, day, hour, minute, kwhImport };
}

describe("UsageAggregator", () => {
  const aggregator = new UsageAggregator();

  it("merges sub-hour pulses in the same hour", () => {
    const hours = aggregator.toHours([
      pulse(2026, 7, 14, 14, 0, 0.1),
      pulse(2026, 7, 14, 14, 15, 0.2),
      pulse(2026, 7, 14, 14, 45, 0.05),
    ]);
    expect(hours).toHaveLength(1);
    expect(hours[0]!.hour).toBe(14);
    expect(hours[0]!.kwh).toBeCloseTo(0.35, 10);
  });

  it("keeps different hours separate", () => {
    const hours = aggregator.toHours([
      pulse(2026, 7, 14, 10, 0, 1),
      pulse(2026, 7, 14, 11, 0, 2),
    ]);
    expect(hours).toHaveLength(2);
    expect(hours.map((h) => h.hour).sort((a, b) => a - b)).toEqual([10, 11]);
  });

  it("omits sparse hours (no zero-fill)", () => {
    const hours = aggregator.toHours([
      pulse(2026, 7, 14, 8, 0, 1),
      pulse(2026, 7, 14, 10, 0, 1),
    ]);
    expect(hours.map((h) => h.hour).sort((a, b) => a - b)).toEqual([8, 10]);
  });

  it("returns empty for empty input", () => {
    expect(aggregator.toHours([])).toEqual([]);
  });
});
