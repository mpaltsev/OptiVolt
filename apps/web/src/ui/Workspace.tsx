import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from "react";
import type { CatalogStore } from "../catalog/store.js";
import type { Plan, Supplier } from "../catalog/types.js";
import {
  detectUsageFormat,
  IL_IEC_FORMAT_ID,
  parseIlIec,
  type FormatId,
} from "../usage/formats/il_iec.js";
import type { HourUsage } from "../usage/aggregate.js";
import { UsageAggregator } from "../usage/aggregate.js";
import { useLocale } from "./LocaleContext.js";

export type WorkspaceProps = {
  catalog: CatalogStore;
  fileInputRef: RefObject<HTMLInputElement | null>;
  hours: HourUsage[] | null;
  fileName: string | null;
  supplierId: string;
  planId: string;
  error: string | null;
  onHours: (hours: HourUsage[], fileName: string) => void;
  onSupplier: (supplierId: string) => void;
  onPlan: (planId: string) => void;
  onError: (message: string | null) => void;
  onClear: () => void;
};

export function Workspace({
  catalog,
  fileInputRef,
  hours,
  fileName,
  supplierId,
  planId,
  error,
  onHours,
  onSupplier,
  onPlan,
  onError,
  onClear,
}: WorkspaceProps) {
  const { t } = useLocale();
  const dropId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [needsFormatPick, setNeedsFormatPick] = useState(false);
  const pendingText = useRef<string | null>(null);
  const pendingName = useRef<string | null>(null);

  const suppliers = catalog.suppliers;
  const plans = catalog.plansForSupplier(supplierId);

  async function readFile(file: File) {
    onError(null);
    setNeedsFormatPick(false);
    const text = await file.text();
    const detected = detectUsageFormat(text);
    if (detected.formatId === IL_IEC_FORMAT_ID) {
      applyParse(text, file.name, IL_IEC_FORMAT_ID);
      return;
    }
    pendingText.current = text;
    pendingName.current = file.name;
    setNeedsFormatPick(true);
  }

  function applyParse(text: string, name: string, formatId: FormatId) {
    try {
      if (formatId !== IL_IEC_FORMAT_ID) {
        throw new Error(t("unsupportedFormat", { id: formatId }));
      }
      const pulses = parseIlIec(text);
      const nextHours = new UsageAggregator().toHours(pulses);
      if (nextHours.length === 0) {
        throw new Error(t("noTimeOfDay"));
      }
      onHours(nextHours, name);
      setNeedsFormatPick(false);
      pendingText.current = null;
      pendingName.current = null;
    } catch (err) {
      onClear();
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  function onFormatPicked(formatId: FormatId) {
    const text = pendingText.current;
    const name = pendingName.current;
    if (!text || !name) return;
    applyParse(text, name, formatId);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void readFile(file);
    event.target.value = "";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  }

  return (
    <section className="section" id="workspace">
      <div className="section-head">
        <h2>{t("workspaceTitle")}</h2>
        <p>{t("workspaceLead")}</p>
      </div>

      <div className="workspace-panel">
        <label
          className={`dropzone${dragOver ? " is-drag" : ""}`}
          htmlFor={dropId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className="dropzone-title">
            {fileName ? fileName : t("dropTitle")}
          </p>
          <p className="dropzone-hint">
            {t("dropHint")}
            {hours ? ` · ${t("dropHintHours", { n: hours.length })}` : ""}
          </p>
          <input
            id={dropId}
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onInputChange}
          />
        </label>

        {needsFormatPick ? (
          <div className="field">
            <label htmlFor="format-pick">{t("formatPickLabel")}</label>
            <select
              id="format-pick"
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value as FormatId;
                if (value) onFormatPicked(value);
              }}
            >
              <option value="" disabled>
                {t("formatPickPlaceholder")}
              </option>
              <option value={IL_IEC_FORMAT_ID}>{t("formatIlIec")}</option>
            </select>
          </div>
        ) : null}

        {error ? <p className="error-box">{error}</p> : null}

        <div className="field-row" id="picks">
          <div className="field">
            <label htmlFor="supplier">{t("currentSupplier")}</label>
            <select
              id="supplier"
              value={supplierId}
              disabled={!hours}
              onChange={(e) => onSupplier(e.target.value)}
            >
              {suppliers.map((s: Supplier) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="plan">{t("currentPlan")}</label>
            <select
              id="plan"
              value={planId}
              disabled={!hours}
              onChange={(e) => onPlan(e.target.value)}
            >
              {plans.map((p: Plan) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.status === "discontinued" ? ` ${t("discontinued")}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
