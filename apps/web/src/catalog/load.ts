import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Catalog,
  CatalogManifest,
  MarketManifestEntry,
  Plan,
  Supplier,
  WeekStart,
} from "./types.js";

/**
 * Loads catalogs from packages/catalog via manifest + market id.
 * Vite JSON import lands in phase 3.
 */
export class CatalogLoader {
  private readonly catalogPackageRoot: string;

  constructor(catalogPackageRoot?: string) {
    this.catalogPackageRoot =
      catalogPackageRoot ??
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../../../packages/catalog",
      );
  }

  loadManifest(): CatalogManifest {
    return this.readJson<CatalogManifest>("manifest.json");
  }

  marketEntry(marketId: string): MarketManifestEntry {
    const manifest = this.loadManifest();
    const entry = manifest.markets[marketId];
    if (!entry) {
      throw new Error(
        `Unknown market "${marketId}". Known: ${Object.keys(manifest.markets).join(", ")}`,
      );
    }
    return entry;
  }

  loadMarket(marketId: string): Catalog {
    return this.loadCatalogFile(marketId, this.marketEntry(marketId));
  }

  /** Dated catalog + stable market config from manifest. */
  loadStore(marketId: string): CatalogStore {
    const entry = this.marketEntry(marketId);
    return new CatalogStore(
      marketId,
      this.loadCatalogFile(marketId, entry),
      entry,
    );
  }

  private loadCatalogFile(
    marketId: string,
    entry: MarketManifestEntry,
  ): Catalog {
    const catalog = this.readJson<Catalog>(entry.catalog);
    if (catalog.market !== marketId) {
      throw new Error(
        `Catalog market "${catalog.market}" does not match manifest key "${marketId}"`,
      );
    }
    return catalog;
  }

  private readJson<T>(relativePath: string): T {
    const absolutePath = path.join(this.catalogPackageRoot, relativePath);
    return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
  }
}

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
