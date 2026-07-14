import { useState, type ReactNode } from "react";
import type { Supplier } from "../../catalog/types.js";
import type { RankRow } from "../../score/rank.js";
import { useLocale } from "../LocaleContext.js";
import { SupplierPopover } from "../SupplierPopover.js";
import { ChartFrame } from "./ChartFrame.js";

type HoverTip = {
  planId: string;
  label: string;
};

type Props = {
  rows: RankRow[];
  planName: (planId: string) => string;
  supplierFor: (planId: string) => Supplier | null;
  currency: string;
  cheapestPlanId: string;
};

export function PlanCostBars({
  rows,
  planName,
  supplierFor,
  currency,
  cheapestPlanId,
}: Props) {
  const { t } = useLocale();
  const [tip, setTip] = useState<HoverTip | null>(null);

  const max = Math.max(...rows.map((r) => r.totalCost), 0.001);
  const width = 400;
  const rowH = 28;
  const height = rows.length * rowH + 8;
  const labelW = 120;
  const barMax = width - labelW - 56;
  const tipSupplier = tip ? supplierFor(tip.planId) : null;

  let tipNode: ReactNode = null;
  if (tip) {
    tipNode = (
      <>
        {tip.label}
        {tipSupplier ? (
          <>
            {" · "}
            <SupplierPopover supplier={tipSupplier} />
          </>
        ) : null}
      </>
    );
  }

  return (
    <ChartFrame
      tip={tipNode}
      empty={rows.length === 0}
      emptyKey="chartEmptyPlans"
      onMouseLeave={() => setTip(null)}
    >
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${t("planCost")} (${currency})`}
      >
        {rows.map((row, index) => {
          const barW = (row.totalCost / max) * barMax;
          const y = index * rowH + 4;
          const name = planName(row.planId);
          const label = `${name}: ${row.totalCost.toFixed(2)} ${currency}${
            row.isCurrent ? ` ${t("currentSuffix")}` : ""
          }`;
          const classes = [
            "bar-h",
            row.isCurrent ? "is-current" : "",
            row.planId === cheapestPlanId ? "is-best" : "",
            tip?.planId === row.planId ? "is-hover" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const hover = { planId: row.planId, label };
          return (
            <g key={row.planId}>
              <text className="axis-label" x={0} y={y + 14}>
                {truncate(name, 16)}
              </text>
              <rect
                className={classes}
                x={labelW}
                y={y}
                width={Math.max(barW, 1)}
                height={18}
                style={{ animationDelay: `${index * 40}ms` }}
                onMouseEnter={() => setTip(hover)}
                onFocus={() => setTip(hover)}
                tabIndex={0}
              />
              <text
                className="axis-label"
                x={labelW + Math.max(barW, 1) + 6}
                y={y + 14}
              >
                {row.totalCost.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
