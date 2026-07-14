import { describe, expect, it } from "vitest";
import { CatalogLoader, CatalogStore } from "../catalog/load.js";
import type { Catalog, Plan } from "../catalog/types.js";
import type { HourUsage } from "../usage/aggregate.js";
import { PlanRanker } from "./rank.js";

const marketStore = new CatalogLoader().loadStore("il");
const sampleCatalog = marketStore.raw;

function hour(
  year: number,
  month: number,
  day: number,
  hourOfDay: number,
  kwh: number,
): HourUsage {
  return { year, month, day, hour: hourOfDay, kwh };
}

function withPlanStatus(
  source: Catalog,
  planId: string,
  status: Plan["status"],
): Catalog {
  return {
    ...source,
    plans: source.plans.map((plan) =>
      plan.id === planId ? { ...plan, status } : plan,
    ),
  };
}

function rankerFor(catalog: Catalog): PlanRanker {
  return new PlanRanker(
    new CatalogStore("il", catalog, marketStore.marketEntry()),
  );
}

describe("PlanRanker", () => {
  const hours = [hour(2026, 7, 14, 10, 5), hour(2026, 7, 14, 21, 5)];

  it("scores a discontinued current plan", () => {
    const catalogClone = withPlanStatus(
      sampleCatalog,
      "example-energy-a",
      "discontinued",
    );
    const rows = rankerFor(catalogClone).rank(hours, "example-energy-a");
    const current = rows.find((row) => row.isCurrent);
    expect(current?.planId).toBe("example-energy-a");
    expect(current?.deltaCost).toBe(0);
    expect(
      rows.some((row) => row.planId === "example-energy-a" && !row.isCurrent),
    ).toBe(false);
  });

  it("includes only other active plans as switch-to", () => {
    const catalogClone = withPlanStatus(
      sampleCatalog,
      "example-energy-b",
      "discontinued",
    );
    const rows = rankerFor(catalogClone).rank(hours, "iec-flat");
    const altIds = rows
      .filter((row) => !row.isCurrent)
      .map((row) => row.planId);
    expect(altIds).toContain("iec-taoz");
    expect(altIds).toContain("example-energy-a");
    expect(altIds).not.toContain("example-energy-b");
    expect(altIds).not.toContain("iec-flat");
  });

  it("sorts by totalCost and sets delta vs current", () => {
    const rows = rankerFor(sampleCatalog).rank(hours, "iec-flat");
    const current = rows.find((row) => row.isCurrent)!;
    expect(current.planId).toBe("iec-flat");

    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.totalCost).toBeGreaterThanOrEqual(rows[i - 1]!.totalCost);
    }

    for (const row of rows) {
      if (row.isCurrent) {
        expect(row.deltaCost).toBe(0);
      } else {
        expect(row.deltaCost).toBeCloseTo(row.totalCost - current.totalCost, 10);
      }
    }
  });
});
