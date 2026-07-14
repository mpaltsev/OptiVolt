import type { CatalogStore } from "../catalog/store.js";
import type { Plan, TimeWindow } from "../catalog/types.js";
import type { HourUsage } from "../usage/aggregate.js";
import { WindowMatcher } from "./windows.js";

export type DayCost = {
  year: number;
  month: number;
  day: number;
  kwh: number;
  /** Energy cost in market currency. */
  energyCost: number;
};

export type PlanScore = {
  planId: string;
  /** Same as market currency — scores are in this unit. */
  currency: string;
  byDay: DayCost[];
  energyCost: number;
  standingCost: number;
  totalCost: number;
  usageMonths: number;
  billPeriods: number;
};

/** Bills an hour range under one plan (daily energy fold + standing). */
export class PlanScorer {
  private readonly windowMatcher: WindowMatcher;

  constructor(
    private readonly catalog: CatalogStore,
    windowMatcher?: WindowMatcher,
  ) {
    this.windowMatcher =
      windowMatcher ?? new WindowMatcher(catalog.weekStart());
  }

  score(planId: string, hours: HourUsage[]): PlanScore {
    const plan = this.catalog.findPlan(planId);
    const baseFlatRatePerKwh = this.catalog.baseFlatRatePerKwh();
    const byDay = this.foldDays(plan, hours, baseFlatRatePerKwh);
    const energyCost = byDay.reduce((sum, day) => sum + day.energyCost, 0);
    const usageMonths = this.countUsageMonths(hours);
    const periodMonths = this.catalog.billingPeriodMonths(plan.supplier_id);
    const billPeriods = usageMonths === 0 ? 0 : usageMonths / periodMonths;
    const standingCost = plan.fixed_per_period * billPeriods;

    return {
      planId: plan.id,
      currency: this.catalog.currency(),
      byDay,
      energyCost,
      standingCost,
      totalCost: energyCost + standingCost,
      usageMonths,
      billPeriods,
    };
  }

  private foldDays(
    plan: Plan,
    hours: HourUsage[],
    baseFlatRatePerKwh: number,
  ): DayCost[] {
    const buckets = new Map<string, DayCost>();

    for (const hourUsage of hours) {
      const energyCost = this.energyForHour(
        plan,
        hourUsage,
        baseFlatRatePerKwh,
      );
      const key = `${hourUsage.year}-${hourUsage.month}-${hourUsage.day}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.kwh += hourUsage.kwh;
        existing.energyCost += energyCost;
      } else {
        buckets.set(key, {
          year: hourUsage.year,
          month: hourUsage.month,
          day: hourUsage.day,
          kwh: hourUsage.kwh,
          energyCost,
        });
      }
    }

    return [...buckets.values()];
  }

  private energyForHour(
    plan: Plan,
    hourUsage: HourUsage,
    baseFlatRatePerKwh: number,
  ): number {
    switch (plan.rate_model) {
      case "flat": {
        if (plan.flat_rate_per_kwh == null) {
          throw new Error(`Flat plan ${plan.id} missing flat_rate_per_kwh`);
        }
        return hourUsage.kwh * plan.flat_rate_per_kwh;
      }
      case "absolute_windows": {
        const window = this.requireWindow(plan, hourUsage);
        if (window.rate_per_kwh == null) {
          throw new Error(`Window on ${plan.id} missing rate_per_kwh`);
        }
        return hourUsage.kwh * window.rate_per_kwh;
      }
      case "pct_off_flat": {
        const window = this.requireWindow(plan, hourUsage);
        if (window.discount_pct == null) {
          throw new Error(`Window on ${plan.id} missing discount_pct`);
        }
        return (
          hourUsage.kwh * baseFlatRatePerKwh * (1 - window.discount_pct / 100)
        );
      }
      default: {
        const _exhaustive: never = plan.rate_model;
        throw new Error(`Unknown rate_model: ${_exhaustive}`);
      }
    }
  }

  private requireWindow(plan: Plan, hourUsage: HourUsage): TimeWindow {
    if (plan.windows == null || plan.windows.length === 0) {
      throw new Error(`Plan ${plan.id} needs windows for ${plan.rate_model}`);
    }
    return this.windowMatcher.match(plan.windows, hourUsage);
  }

  private countUsageMonths(hours: HourUsage[]): number {
    const months = new Set<string>();
    for (const hour of hours) {
      months.add(`${hour.year}-${hour.month}`);
    }
    return months.size;
  }
}
