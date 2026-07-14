import { useMemo, useState } from "react";
import type { CatalogStore } from "../catalog/store.js";
import type { Supplier } from "../catalog/types.js";
import type { RankRow } from "../score/rank.js";
import type { HourUsage } from "../usage/aggregate.js";
import { hoursToDaily } from "../usage/daily.js";
import { DailyUsageBars } from "./charts/DailyUsageBars.js";
import { PlanCostBars } from "./charts/PlanCostBars.js";
import type { MessageKey } from "./i18n/index.js";
import { useLocale } from "./LocaleContext.js";
import { SupplierPopover } from "./SupplierPopover.js";

type Props = {
  catalog: CatalogStore;
  hours: HourUsage[];
  rows: RankRow[];
  stale: boolean;
};

type SortKey =
  | "plan"
  | "supplier"
  | "energyCost"
  | "standingCost"
  | "totalCost"
  | "deltaCost";

type SortDir = "asc" | "desc";

const SORT_COLUMNS: {
  key: SortKey;
  labelKey: MessageKey;
  numeric?: boolean;
}[] = [
  { key: "plan", labelKey: "colPlan" },
  { key: "supplier", labelKey: "colSupplier" },
  { key: "energyCost", labelKey: "colEnergy", numeric: true },
  { key: "standingCost", labelKey: "colStanding", numeric: true },
  { key: "totalCost", labelKey: "colTotal", numeric: true },
  { key: "deltaCost", labelKey: "colDelta", numeric: true },
];

export function Results({ catalog, hours, rows, stale }: Props) {
  const { t } = useLocale();
  const currency = catalog.currency();
  const days = hoursToDaily(hours);
  const [sortKey, setSortKey] = useState<SortKey>("totalCost");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function planName(planId: string): string {
    try {
      return catalog.findPlan(planId).name;
    } catch {
      return planId;
    }
  }

  function supplierFor(planId: string): Supplier | null {
    try {
      const plan = catalog.findPlan(planId);
      return catalog.findSupplier(plan.supplier_id);
    } catch {
      return null;
    }
  }

  function supplierName(planId: string): string {
    return supplierFor(planId)?.name ?? "—";
  }

  function formatMoney(value: number): string {
    return `${value.toFixed(2)} ${currency}`;
  }

  function formatDelta(value: number): string {
    if (Math.abs(value) < 0.005) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)} ${currency}`;
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "plan":
          cmp = planName(a.planId).localeCompare(planName(b.planId));
          break;
        case "supplier":
          cmp = supplierName(a.planId).localeCompare(supplierName(b.planId));
          break;
        case "energyCost":
          cmp = a.energyCost - b.energyCost;
          break;
        case "standingCost":
          cmp = a.standingCost - b.standingCost;
          break;
        case "totalCost":
          cmp = a.totalCost - b.totalCost;
          break;
        case "deltaCost":
          cmp = a.deltaCost - b.deltaCost;
          break;
      }
      return cmp * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir, catalog]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortMark(key: SortKey): string {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const cheapestId = rows.reduce(
    (best, row) => (row.totalCost < best.totalCost ? row : best),
    rows[0]!,
  ).planId;

  return (
    <section className="section results is-enter" id="results">
      <div className="section-head">
        <h2>{t("resultsTitle")}</h2>
        <p>{t("resultsLead")}</p>
      </div>

      {stale ? (
        <p className="warn-box">
          {t("staleWarn", { asOf: catalog.raw.as_of })}
        </p>
      ) : null}

      <div className="rank-table-wrap">
        <table className="rank-table">
          <thead>
            <tr>
              {SORT_COLUMNS.map((col) => (
                <th key={col.key} className={col.numeric ? "num" : undefined}>
                  <button
                    type="button"
                    className="th-sort"
                    onClick={() => toggleSort(col.key)}
                  >
                    {t(col.labelKey)}
                    {sortMark(col.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const supplier = supplierFor(row.planId);
              return (
                <tr
                  key={row.planId}
                  className={row.isCurrent ? "is-current" : undefined}
                >
                  <td>
                    {planName(row.planId)}
                    {row.isCurrent ? ` ${t("currentSuffix")}` : ""}
                  </td>
                  <td>
                    {supplier ? (
                      <SupplierPopover supplier={supplier} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="num">{formatMoney(row.energyCost)}</td>
                  <td className="num">{formatMoney(row.standingCost)}</td>
                  <td className="num">{formatMoney(row.totalCost)}</td>
                  <td
                    className={`num ${
                      row.deltaCost < -0.005
                        ? "delta-save"
                        : row.deltaCost > 0.005
                          ? "delta-cost"
                          : ""
                    }`}
                  >
                    {row.isCurrent ? "0" : formatDelta(row.deltaCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="chart-grid">
        <div className="chart-block">
          <h3>{t("dailyUsage")}</h3>
          <p>{t("dailyUsageHint")}</p>
          <DailyUsageBars days={days} />
        </div>
        <div className="chart-block">
          <h3>{t("planCost")}</h3>
          <p>{t("planCostHint", { currency })}</p>
          <PlanCostBars
            rows={sortedRows}
            planName={planName}
            currency={currency}
            cheapestPlanId={cheapestId}
            supplierFor={supplierFor}
          />
        </div>
      </div>
    </section>
  );
}
