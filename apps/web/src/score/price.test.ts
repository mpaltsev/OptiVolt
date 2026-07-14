import { describe, expect, it } from "vitest";
import type { Catalog } from "../catalog/types.js";
import { PlanScorer } from "./price.js";
import { hour, ilCatalog, ilStore, storeFor, withPlan } from "./test_helpers.js";

const marketStore = ilStore();
const sampleCatalog = ilCatalog();
const baseFlat = marketStore.baseFlatRatePerKwh();

function scorerFor(catalog: Catalog): PlanScorer {
  return new PlanScorer(storeFor(catalog));
}

function absoluteRate(planId: string, windowIndex: number): number {
  const plan = marketStore.findPlan(planId);
  const rate = plan.windows?.[windowIndex]?.rate_per_kwh;
  if (rate == null) {
    throw new Error(`Missing absolute rate on ${planId} window ${windowIndex}`);
  }
  return rate;
}

describe("PlanScorer", () => {
  const scorer = scorerFor(sampleCatalog);

  it("prices Plan A bands off flat base", () => {
    const midday = scorer.score("example-energy-a", [
      hour(2026, 7, 14, 10, 10),
    ]);
    expect(midday.energyCost).toBeCloseTo(10 * baseFlat * 1, 10);

    const evening = scorer.score("example-energy-a", [
      hour(2026, 7, 14, 21, 10),
    ]);
    expect(evening.energyCost).toBeCloseTo(10 * baseFlat * 0.9, 10);
  });

  it("prices Plan B overnight at 10% off", () => {
    const overnight = scorer.score("example-energy-b", [
      hour(2026, 7, 14, 23, 5),
      hour(2026, 7, 14, 3, 5),
    ]);
    expect(overnight.energyCost).toBeCloseTo(10 * baseFlat * 0.9, 10);

    const daytime = scorer.score("example-energy-b", [
      hour(2026, 7, 14, 12, 10),
    ]);
    expect(daytime.energyCost).toBeCloseTo(10 * baseFlat * 1, 10);
  });

  it("uses absolute peak vs catch-all from plan windows", () => {
    const peakRate = absoluteRate("iec-taoz", 0);
    const offPeakRate = absoluteRate("iec-taoz", 1);

    const peak = scorer.score("iec-taoz", [hour(2026, 7, 13, 18, 4)]);
    expect(peak.energyCost).toBeCloseTo(4 * peakRate, 10);

    const weekend = scorer.score("iec-taoz", [hour(2026, 7, 11, 18, 4)]);
    expect(weekend.energyCost).toBeCloseTo(4 * offPeakRate, 10);
  });

  it("prices flat base plan and still folds by_day", () => {
    const score = scorer.score("iec-flat", [
      hour(2026, 7, 14, 10, 3),
      hour(2026, 7, 15, 11, 7),
    ]);
    expect(score.energyCost).toBeCloseTo(10 * baseFlat, 10);
    expect(score.byDay).toHaveLength(2);
    expect(score.byDay.map((d) => d.day).sort((a, b) => a - b)).toEqual([
      14, 15,
    ]);
  });

  it("keeps by_day sparse and sums energy", () => {
    const score = scorer.score("iec-flat", [
      hour(2026, 7, 14, 1, 1),
      hour(2026, 7, 14, 2, 1),
      hour(2026, 7, 16, 1, 2),
    ]);
    expect(score.byDay).toHaveLength(2);
    const day14 = score.byDay.find((d) => d.day === 14)!;
    expect(day14.kwh).toBe(2);
    expect(day14.energyCost).toBeCloseTo(2 * baseFlat, 10);
    expect(score.energyCost).toBeCloseTo(
      score.byDay.reduce((s, d) => s + d.energyCost, 0),
      10,
    );
  });

  it("applies standing via bill_periods (3 months / period 2 = 1.5)", () => {
    const catalogWithFee = withPlan(sampleCatalog, "iec-flat", {
      fixed_per_period: 100,
    });
    const score = scorerFor(catalogWithFee).score("iec-flat", [
      hour(2026, 1, 1, 0, 1),
      hour(2026, 2, 1, 0, 1),
      hour(2026, 3, 1, 0, 1),
    ]);
    expect(score.usageMonths).toBe(3);
    expect(score.billPeriods).toBe(1.5);
    expect(score.standingCost).toBe(150);
    expect(score.totalCost).toBeCloseTo(score.energyCost + 150, 10);
  });
});
