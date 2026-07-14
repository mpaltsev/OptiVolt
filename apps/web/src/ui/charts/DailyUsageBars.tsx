import { useState } from "react";
import type { DayUsage } from "../../usage/daily.js";
import { useLocale } from "../LocaleContext.js";
import { ChartFrame } from "./ChartFrame.js";

type Props = {
  days: DayUsage[];
};

export function DailyUsageBars({ days }: Props) {
  const { t } = useLocale();
  const [tip, setTip] = useState<string | null>(null);

  const max = Math.max(...days.map((d) => d.kwh), 0.001);
  const width = 400;
  const height = 160;
  const pad = { top: 8, right: 8, bottom: 28, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const gap = 2;
  const barW = Math.max(2, (innerW - gap * (days.length - 1)) / days.length);

  return (
    <ChartFrame tip={tip} empty={days.length === 0} emptyKey="chartEmptyUsage">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("dailyUsage")}
      >
        {days.map((day, index) => {
          const h = (day.kwh / max) * innerH;
          const x = pad.left + index * (barW + gap);
          const y = pad.top + innerH - h;
          const label =
            days.length <= 14 || index % Math.ceil(days.length / 8) === 0
              ? `${day.day}/${day.month}`
              : "";
          const tipText = `${day.day}/${day.month}/${day.year}: ${day.kwh.toFixed(2)} kWh`;
          return (
            <g key={`${day.year}-${day.month}-${day.day}`}>
              <rect
                className={`bar${tip === tipText ? " is-hover" : ""}`}
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 1)}
                style={{ animationDelay: `${index * 20}ms` }}
                onMouseEnter={() => setTip(tipText)}
                onMouseLeave={() => setTip(null)}
                onFocus={() => setTip(tipText)}
                onBlur={() => setTip(null)}
                tabIndex={0}
              />
              {label ? (
                <text
                  className="axis-label"
                  x={x + barW / 2}
                  y={height - 8}
                  textAnchor="middle"
                >
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
