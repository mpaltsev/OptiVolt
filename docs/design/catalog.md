# Catalog design

Parent: [../ARCHITECTURE.md](../ARCHITECTURE.md). Windows rules: [windows.md](windows.md).

## Files

| File | Authoring | Role |
|------|-----------|------|
| `packages/catalog/il/catalog-YYYY-MM-DD.json` | LLM for private; hand for IEC | Suppliers + plans + windows |
| `packages/catalog/il/manifest.json` | Hand | Which catalog file `apps/web` bundles |

```json
{
  "market": "il",
  "catalog": "catalog-2026-07-14.json"
}
```

Catalog field `iec_flat_plan_id` must point at the published IEC flat plan (base for `%` plans).

Format: **JSON** (+ later JSON Schema under `packages/catalog/`).

## Lifecycle: draft vs published

| Stage | Where | `status` |
|-------|--------|----------|
| Extract draft | `tools/extract` output / PR scratch | not in published file |
| Published | `catalog-*.json` | `active` or `discontinued` only |

Merging into catalog = approval. No `reviewed` / `draft` in published file.

## Catalog file shape

```json
{
  "schema_version": 1,
  "market": "il",
  "as_of": "2026-07-14",
  "currency": "ILS",
  "vat_included": true,
  "billing_period_months": 2,
  "iec_flat_plan_id": "iec-flat",
  "suppliers": [
    {
      "id": "iec",
      "name": "IEC",
      "website": "https://www.iec.co.il",
      "default_plan_id": "iec-taoz",
      "billing_period_months": 2
    },
    {
      "id": "example-energy",
      "name": "Example Energy",
      "website": "https://example.co.il",
      "default_plan_id": "example-energy-a",
      "billing_period_months": 2
    }
  ],
  "plans": [
    {
      "id": "iec-flat",
      "supplier_id": "iec",
      "name": "Residential flat",
      "status": "active",
      "rate_model": "flat",
      "flat_ils_kwh": 0.48,
      "windows": null,
      "fixed_ils_per_period": 0,
      "discount_schedule": null,
      "available_from": null,
      "available_to": null,
      "confidence": 1.0,
      "source_url": null,
      "extracted_at": null,
      "contract_months": 0,
      "notes": "BASE rate for all pct_off_flat plans"
    },
    {
      "id": "iec-taoz",
      "supplier_id": "iec",
      "name": "Residential TAOz",
      "status": "active",
      "rate_model": "absolute_windows",
      "flat_ils_kwh": null,
      "windows": [
        {
          "start": "17:00",
          "end": "23:00",
          "months": [6, 7, 8, 9],
          "weekdays": [0, 1, 2, 3, 4],
          "rate_ils_kwh": 0.55,
          "discount_pct": null
        },
        {
          "start": "00:00",
          "end": "24:00",
          "months": null,
          "weekdays": null,
          "rate_ils_kwh": 0.38,
          "discount_pct": null
        }
      ],
      "fixed_ils_per_period": 0,
      "discount_schedule": null,
      "available_from": null,
      "available_to": null,
      "confidence": 1.0,
      "source_url": null,
      "extracted_at": null,
      "contract_months": 0,
      "notes": "Illustrative TAOz; fill real windows/rates from official table. First match wins."
    },
    {
      "id": "example-energy-a",
      "supplier_id": "example-energy",
      "name": "Plan A (window %)",
      "status": "active",
      "rate_model": "pct_off_flat",
      "flat_ils_kwh": null,
      "windows": [
        {
          "start": "00:00",
          "end": "07:00",
          "months": null,
          "weekdays": null,
          "rate_ils_kwh": null,
          "discount_pct": 5
        },
        {
          "start": "07:00",
          "end": "20:00",
          "months": null,
          "weekdays": null,
          "rate_ils_kwh": null,
          "discount_pct": 0
        },
        {
          "start": "20:00",
          "end": "24:00",
          "months": null,
          "weekdays": null,
          "rate_ils_kwh": null,
          "discount_pct": 10
        }
      ],
      "fixed_ils_per_period": 0,
      "discount_schedule": null,
      "available_from": "2025-01-01",
      "available_to": null,
      "confidence": 0.9,
      "source_url": "https://example.co.il/plans/a",
      "extracted_at": "2026-07-14T10:00:00Z",
      "contract_months": 0,
      "notes": "% off iec-flat; contiguous half-open windows (marketing 00:01/07:01 normalized at ingest)"
    },
    {
      "id": "example-energy-b",
      "supplier_id": "example-energy",
      "name": "Plan B (other windows)",
      "status": "active",
      "rate_model": "pct_off_flat",
      "flat_ils_kwh": null,
      "windows": [
        {
          "start": "06:00",
          "end": "22:00",
          "months": null,
          "weekdays": null,
          "rate_ils_kwh": null,
          "discount_pct": 0
        },
        {
          "start": "22:00",
          "end": "06:00",
          "months": null,
          "weekdays": null,
          "rate_ils_kwh": null,
          "discount_pct": 10
        }
      ],
      "fixed_ils_per_period": 0,
      "discount_schedule": null,
      "available_from": "2025-01-01",
      "available_to": null,
      "confidence": 0.9,
      "source_url": "https://example.co.il/plans/b",
      "extracted_at": "2026-07-14T10:00:00Z",
      "contract_months": 0,
      "notes": "Same supplier, different windows; overnight wrap OK"
    }
  ]
}
```

## Enums / field rules

| Field | Values / rule |
|-------|----------------|
| `rate_model` | `flat` \| `absolute_windows` \| `pct_off_flat` |
| `flat` | Requires `flat_ils_kwh`; `windows` null |
| `absolute_windows` | `windows` with `rate_ils_kwh` each; pass coverage validate. IEC TAOz uses this |
| `pct_off_flat` | `windows` with `discount_pct` each **or** single full-day window; base = `iec_flat_plan_id` |
| Uniform % all day | One window `00:00`→`24:00` with that `discount_pct` (no separate top-level % field) |
| `iec_flat_plan_id` | Catalog-level; must be a `flat` plan |
| `status` | `active` \| `discontinued` |
| `discount_schedule` | Reserved for tenure; **v1 score ignores**. Prefer separate plans if welcome vs after differ a lot |
| `vat_included` | Must be `true` for IL v1 |
| `billing_period_months` | Catalog default **2**; supplier may override |
| `fixed_ils_per_period` | Standing ₪ per billing period |
| Exit fees | Not in Israel — omit |
| IEC | Supplier `iec` with at least `iec-flat` + `iec-taoz` |
| Current plan | Any published plan (**incl. discontinued**) |
| Switch-to list | Other `status == active` plans only |

Resolve period length: `supplier.billing_period_months` ?? catalog default.

**ponytail:** Tenure/stage deferred. Window `%` / absolute rates only.
