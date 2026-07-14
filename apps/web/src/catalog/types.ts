/** Catalog + manifest shapes (snake_case at the wire boundary). */

export type RateModel = "flat" | "absolute_windows" | "pct_off_flat";

export type PlanStatus = "active" | "discontinued";

/** Which civil day is weekday index 0 in this market's `weekdays` arrays. */
export type WeekStart = "sunday" | "monday";

export type TimeWindow = {
  start: string;
  end: string;
  months: number[] | null;
  weekdays: number[] | null;
  /** Absolute price per kWh in market `currency`. */
  rate_per_kwh: number | null;
  discount_pct: number | null;
};

export type Supplier = {
  id: string;
  name: string;
  website: string;
  default_plan_id: string;
  billing_period_months?: number;
};

export type Plan = {
  id: string;
  supplier_id: string;
  name: string;
  status: PlanStatus;
  rate_model: RateModel;
  /** Flat price per kWh in market `currency`. */
  flat_rate_per_kwh: number | null;
  windows: TimeWindow[] | null;
  /** Standing charge per billing period in market `currency`. */
  fixed_per_period: number;
  discount_schedule: unknown;
  available_from: string | null;
  available_to: string | null;
  confidence: number;
  source_url: string | null;
  extracted_at: string | null;
  contract_months: number;
  notes: string;
};

/** Dated rates/plans snapshot for one market. */
export type Catalog = {
  schema_version: number;
  market: string;
  as_of: string;
  vat_included: boolean;
  billing_period_months: number;
  flat_base_plan_id: string;
  suppliers: Supplier[];
  plans: Plan[];
};

/** Stable market config — does not change when rolling dated catalogs. */
export type MarketManifestEntry = {
  /** Path relative to `packages/catalog/`. */
  catalog: string;
  /** Prefill UI / baseline pick for this market. */
  default_supplier_id: string;
  /** ISO 4217; unit for all rate/fee/score amounts. */
  currency: string;
  /** IANA TZ for window clocks + usage local time. */
  timezone: string;
  /** Weekday index 0 for all `windows[].weekdays` in this market. */
  week_start: WeekStart;
};

export type CatalogManifest = {
  markets: Record<string, MarketManifestEntry>;
};
