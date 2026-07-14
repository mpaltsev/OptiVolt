import type { CatalogStore } from "../catalog/load.js";
import type { HourUsage } from "../usage/aggregate.js";
import { PlanScorer, type PlanScore } from "./price.js";

export type RankRow = PlanScore & {
  deltaCost: number;
  isCurrent: boolean;
};

/**
 * Score current (any status) and other active plans; sort by totalCost ascending.
 * Current is included with delta 0; alternatives exclude current.
 */
export class PlanRanker {
  private readonly scorer: PlanScorer;

  constructor(
    private readonly catalog: CatalogStore,
    scorer?: PlanScorer,
  ) {
    this.scorer = scorer ?? new PlanScorer(catalog);
  }

  rank(hours: HourUsage[], currentPlanId: string): RankRow[] {
    this.catalog.findPlan(currentPlanId); // fail fast if unknown

    const currentScore = this.scorer.score(currentPlanId, hours);
    const rows: RankRow[] = [
      { ...currentScore, deltaCost: 0, isCurrent: true },
    ];

    for (const plan of this.catalog.plans) {
      if (plan.id === currentPlanId) continue;
      if (plan.status !== "active") continue;
      const score = this.scorer.score(plan.id, hours);
      rows.push({
        ...score,
        deltaCost: score.totalCost - currentScore.totalCost,
        isCurrent: false,
      });
    }

    rows.sort((left, right) => left.totalCost - right.totalCost);
    return rows;
  }
}
