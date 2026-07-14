import type {
  Catalog,
  MarketManifestEntry,
  Plan,
  Supplier,
  WeekStart,
} from "./types.js";

/** Lookup helpers: dated catalog + stable market config. */
export class CatalogStore {
  constructor(
    private readonly marketId: string,
    private readonly catalog: Catalog,
    private readonly marketConfig: MarketManifestEntry,
  ) {}

  get raw(): Catalog {
    return this.catalog;
  }

  get market(): string {
    return this.marketId;
  }

  marketEntry(): MarketManifestEntry {
    return this.marketConfig;
  }

  currency(): string {
    return this.marketConfig.currency;
  }

  timezone(): string {
    return this.marketConfig.timezone;
  }

  weekStart(): WeekStart {
    return this.marketConfig.week_start;
  }

  get plans(): Plan[] {
    return this.catalog.plans;
  }

  get suppliers(): Supplier[] {
    return this.catalog.suppliers;
  }

  /** Plans for one supplier (any status — UI filters discontinued for switch-to). */
  plansForSupplier(supplierId: string): Plan[] {
    return this.catalog.plans.filter((plan) => plan.supplier_id === supplierId);
  }

  defaultSupplier(): Supplier {
    return this.findSupplier(this.marketConfig.default_supplier_id);
  }

  findPlan(planId: string): Plan {
    const plan = this.catalog.plans.find((candidate) => candidate.id === planId);
    if (!plan) {
      throw new Error(`Unknown plan: ${planId}`);
    }
    return plan;
  }

  findSupplier(supplierId: string): Supplier {
    const supplier = this.catalog.suppliers.find(
      (candidate) => candidate.id === supplierId,
    );
    if (!supplier) {
      throw new Error(`Unknown supplier: ${supplierId}`);
    }
    return supplier;
  }

  /** Rate from the catalog's flat base plan, in market currency. */
  baseFlatRatePerKwh(): number {
    const basePlan = this.findPlan(this.catalog.flat_base_plan_id);
    if (basePlan.rate_model !== "flat" || basePlan.flat_rate_per_kwh == null) {
      throw new Error(
        `flat_base_plan_id ${this.catalog.flat_base_plan_id} must be a flat plan with flat_rate_per_kwh`,
      );
    }
    return basePlan.flat_rate_per_kwh;
  }

  billingPeriodMonths(supplierId: string): number {
    const supplier = this.findSupplier(supplierId);
    return supplier.billing_period_months ?? this.catalog.billing_period_months;
  }
}
