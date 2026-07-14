import { useEffect, useId, useRef, useState } from "react";
import type { Supplier } from "../catalog/types.js";
import { useLocale } from "./LocaleContext.js";

type Props = {
  supplier: Supplier;
  className?: string;
};

/** Click/tap opens supplier info balloon (better than hover: mobile + linkable). */
export function SupplierPopover({ supplier, className }: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const website = supplier.website?.trim() || null;
  const phone = supplier.phone?.trim() || null;
  const rating = supplier.support_rating;

  return (
    <span className={`supplier-pop ${className ?? ""}`} ref={rootRef}>
      <button
        type="button"
        className="supplier-link supplier-pop-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {supplier.name}
      </button>
      {open ? (
        <div
          className="supplier-balloon"
          id={panelId}
          role="dialog"
          aria-label={t("supplierInfo")}
        >
          <div className="supplier-balloon-head">
            <strong>{supplier.name}</strong>
            <button
              type="button"
              className="supplier-balloon-close"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
            >
              ×
            </button>
          </div>
          <dl className="supplier-balloon-dl">
            {website ? (
              <div>
                <dt>{t("website")}</dt>
                <dd>
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {website.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </div>
            ) : null}
            {phone ? (
              <div>
                <dt>{t("phone")}</dt>
                <dd>
                  <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>
                </dd>
              </div>
            ) : null}
            {rating != null ? (
              <div>
                <dt>{t("supportRating")}</dt>
                <dd>
                  {rating.toFixed(1)} / 5
                  <span className="rating-stars" aria-hidden="true">
                    {"★".repeat(Math.round(rating))}
                    {"☆".repeat(5 - Math.round(rating))}
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </span>
  );
}
