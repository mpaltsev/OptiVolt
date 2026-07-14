import { CatalogLoader, CatalogStore } from "../catalog/load.js";
import type { Catalog, Plan } from "../catalog/types.js";
import type { HourUsage } from "../usage/aggregate.js";

const marketStore = new CatalogLoader().loadStore("il");

export function ilStore(): CatalogStore {
  return marketStore;
}

export function ilCatalog(): Catalog {
  return marketStore.raw;
}

export function storeFor(catalog: Catalog): CatalogStore {
  return new CatalogStore("il", catalog, marketStore.marketEntry());
}

export function hour(
  year: number,
  month: number,
  day: number,
  hourOfDay: number,
  kwh = 1,
): HourUsage {
  return { year, month, day, hour: hourOfDay, kwh };
}

/** Patch one plan field(s) into a catalog clone. */
export function withPlan(
  source: Catalog,
  planId: string,
  patch: Partial<Plan>,
): Catalog {
  return {
    ...source,
    plans: source.plans.map((plan) =>
      plan.id === planId ? ({ ...plan, ...patch } as Plan) : plan,
    ),
  };
}
