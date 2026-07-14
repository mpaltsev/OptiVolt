import { useEffect, useMemo, useRef, useState } from "react";
import { loadBundledStore } from "../catalog/bundled.js";
import { PlanRanker } from "../score/rank.js";
import type { HourUsage } from "../usage/aggregate.js";
import { isUsageStale } from "../usage/daily.js";
import { Hero } from "./Hero.js";
import { HowItWorks } from "./HowItWorks.js";
import { Privacy } from "./Privacy.js";
import { Results } from "./Results.js";
import { Workspace } from "./Workspace.js";

const MARKET = "il";

export function App() {
  const catalog = useMemo(() => loadBundledStore(MARKET), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultSupplier = catalog.defaultSupplier();
  const [supplierId, setSupplierId] = useState(defaultSupplier.id);
  const [planId, setPlanId] = useState(defaultSupplier.default_plan_id);
  const [hours, setHours] = useState<HourUsage[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!hours || !planId) return null;
    return new PlanRanker(catalog).rank(hours, planId);
  }, [catalog, hours, planId]);

  const stale = hours ? isUsageStale(hours, catalog.raw.as_of) : false;

  // Scroll to results once when a new file finishes loading.
  useEffect(() => {
    if (!fileName) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [fileName]);

  function onSupplier(nextSupplierId: string) {
    setSupplierId(nextSupplierId);
    const supplier = catalog.findSupplier(nextSupplierId);
    const plans = catalog.plansForSupplier(nextSupplierId);
    const preferred =
      plans.find((p) => p.id === supplier.default_plan_id) ?? plans[0];
    if (preferred) setPlanId(preferred.id);
  }

  function onUploadClick() {
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => fileInputRef.current?.click(), 350);
  }

  return (
    <div className="app">
      <Hero onUploadClick={onUploadClick} />
      <HowItWorks />
      <Privacy />
      <Workspace
        catalog={catalog}
        fileInputRef={fileInputRef}
        hours={hours}
        fileName={fileName}
        supplierId={supplierId}
        planId={planId}
        error={error}
        onHours={(next, name) => {
          setHours(next);
          setFileName(name);
          setError(null);
        }}
        onSupplier={onSupplier}
        onPlan={setPlanId}
        onError={setError}
        onClear={() => {
          setHours(null);
          setFileName(null);
        }}
      />
      {hours && rows ? (
        <Results
          catalog={catalog}
          hours={hours}
          rows={rows}
          stale={stale}
        />
      ) : null}
    </div>
  );
}
