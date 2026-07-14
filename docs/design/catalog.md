# Catalog design

Parent: [../ARCHITECTURE.md](../ARCHITECTURE.md). Windows rules: [windows.md](windows.md).

## Files

| File | Authoring | Role |
|------|-----------|------|
| `packages/catalog/manifest.json` | Hand | Stable market config + which dated catalog ships |
| `packages/catalog/<market>/catalog-YYYY-MM-DD.json` | Hand + LLM (private) | Dated suppliers + plans + windows |

```json
{
  "markets": {
    "<market>": {
      "catalog": "<market>/catalog-YYYY-MM-DD.json",
      "default_supplier_id": "<supplier_id>",
      "currency": "XXX",
      "timezone": "Area/City",
      "week_start": "sunday"
    }
  }
}
```

Paths in the manifest are relative to `packages/catalog/`. Market id lives only as the map key.

**Manifest (stable per market — not copied per `as_of`):**

| Field | Meaning |
|-------|---------|
| `catalog` | Relative path to the dated catalog file currently shipped |
| `default_supplier_id` | UI baseline supplier; that supplier’s `default_plan_id` picks starting plan |
| `currency` | ISO 4217; unit for all rate/fee/score amounts |
| `timezone` | IANA TZ for window clocks + usage local time |
| `week_start` | `sunday` \| `monday` — weekday index 0 for `windows[].weekdays` |

**Dated catalog:** rates, plans, `as_of`, `flat_base_plan_id`, billing defaults. Rate fields are denominated in the market’s manifest `currency`.

`flat_base_plan_id` must point at a published `flat` plan **in that catalog file** (base for all `pct_off_flat` plans).

Format: **JSON** (+ later JSON Schema under `packages/catalog/`).

Shipped sample: market `il` + `packages/catalog/il/`. Other markets = new folder + manifest entry.

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
  "market": "<market>",
  "as_of": "YYYY-MM-DD",
  "vat_included": true,
  "billing_period_months": 2,
  "flat_base_plan_id": "utility-flat",
  "suppliers": [
    {
      "id": "utility",
      "name": "Utility",
      "website": "https://example.com",
      "default_plan_id": "utility-tou",
      "billing_period_months": 2
    },
    {
      "id": "competitor",
      "name": "Competitor",
      "website": "https://example.com",
      "default_plan_id": "competitor-a",
      "billing_period_months": 2
    }
  ],
  "plans": [
    {
      "id": "utility-flat",
      "supplier_id": "utility",
      "name": "Residential flat",
      "status": "active",
      "rate_model": "flat",
      "flat_rate_per_kwh": 0.48,
      "windows": null,
      "fixed_per_period": 0,
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
      "id": "utility-tou",
      "supplier_id": "utility",
      "name": "Residential TOU",
      "status": "active",
      "rate_model": "absolute_windows",
      "flat_rate_per_kwh": null,
      "windows": [
        {
          "start": "17:00",
          "end": "23:00",
          "months": [6, 7, 8, 9],
          "weekdays": [0, 1, 2, 3, 4],
          "rate_per_kwh": 0.55,
          "discount_pct": null
        },
        {
          "start": "00:00",
          "end": "24:00",
          "months": null,
          "weekdays": null,
          "rate_per_kwh": 0.38,
          "discount_pct": null
        }
      ],
      "fixed_per_period": 0,
      "discount_schedule": null,
      "available_from": null,
      "available_to": null,
      "confidence": 1.0,
      "source_url": null,
      "extracted_at": null,
      "contract_months": 0,
      "notes": "Illustrative TOU; first match wins"
    },
    {
      "id": "competitor-a",
      "supplier_id": "competitor",
      "name": "Plan A (window %)",
      "status": "active",
      "rate_model": "pct_off_flat",
      "flat_rate_per_kwh": null,
      "windows": [
        {
          "start": "00:00",
          "end": "07:00",
          "months": null,
          "weekdays": null,
          "rate_per_kwh": null,
          "discount_pct": 5
        },
        {
          "start": "07:00",
          "end": "20:00",
          "months": null,
          "weekdays": null,
          "rate_per_kwh": null,
          "discount_pct": 0
        },
        {
          "start": "20:00",
          "end": "24:00",
          "months": null,
          "weekdays": null,
          "rate_per_kwh": null,
          "discount_pct": 10
        }
      ],
      "fixed_per_period": 0,
      "discount_schedule": null,
      "available_from": "2025-01-01",
      "available_to": null,
      "confidence": 0.9,
      "source_url": "https://example.com/plans/a",
      "extracted_at": "2026-07-14T10:00:00Z",
      "contract_months": 0,
      "notes": "% off flat_base_plan_id; contiguous half-open windows"
    }
  ]
}
```

## Enums / field rules

| Field | Values / rule |
|-------|----------------|
| `rate_model` | `flat` \| `absolute_windows` \| `pct_off_flat` |
| `flat` | Requires `flat_rate_per_kwh`; `windows` null |
| `absolute_windows` | `windows` with `rate_per_kwh` each; pass coverage validate |
| `pct_off_flat` | `windows` with `discount_pct` each **or** single full-day window; base = `flat_base_plan_id` |
| Uniform % all day | One window `00:00`→`24:00` with that `discount_pct` (no separate top-level % field) |
| `flat_base_plan_id` | Catalog-level; must be a `flat` plan in the same file |
| `status` | `active` \| `discontinued` |
| `discount_schedule` | Reserved for tenure; **v1 score ignores** |
| `vat_included` | Market policy flag on the dated file (scorer does not add VAT separately in v1) |
| `billing_period_months` | Catalog default; supplier may override |
| `fixed_per_period` | Standing charge per billing period (market `currency`) |
| Current plan | Any published plan (**incl. discontinued**) |
| Switch-to list | Other `status == active` plans only |

Resolve period length: `supplier.billing_period_months` ?? catalog default.

**ponytail:** Tenure/stage deferred. Window `%` / absolute rates only.
