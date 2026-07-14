import type { ReactNode } from "react";
import { useLocale } from "../LocaleContext.js";

type Props = {
  tip: ReactNode | null;
  empty?: boolean;
  emptyKey?: "chartEmptyUsage" | "chartEmptyPlans";
  onMouseLeave?: () => void;
  children: ReactNode;
};

/** Shared tip shell around SVG charts (geometry stays in each chart). */
export function ChartFrame({
  tip,
  empty,
  emptyKey,
  onMouseLeave,
  children,
}: Props) {
  const { t } = useLocale();

  if (empty && emptyKey) {
    return <p className="file-meta">{t(emptyKey)}</p>;
  }

  return (
    <div className="chart-interactive" onMouseLeave={onMouseLeave}>
      {children}
      <p className="chart-tip" aria-live="polite">
        {tip ?? t("hoverBar")}
      </p>
    </div>
  );
}
