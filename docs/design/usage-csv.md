# Usage CSV design

Parent: [../ARCHITECTURE.md](../ARCHITECTURE.md). Scoring: [scoring.md](scoring.md).

## Goal

Turn a usage file into a list of pulses the scorer can aggregate to **hours**.

Several CSV dialects exist. **One adapter per format** — do not bend an existing parser to fit a new dialect.

## Canonical pulse (after parse)

Every format adapter must emit:

```text
{ meter_id?, timestamp, kwh_import, kwh_export? }
```

- `timestamp` — interval/pulse start in market **`timezone`**
- `kwh_import` — import for that pulse
- `kwh_export` — optional; ignored in score v1

Scorer then: pulses → hourly kWh (floor start to hour; sparse OK) → windows — [scoring.md](scoring.md).

Already-hourly files (one row per hour) are fine: adapter emits one pulse per hour; aggregate is identity.

Period-only totals (no time-of-day) → reject; cannot rank windowed plans.

## Format adapters

| `format_id` | Status | Notes |
|-------------|--------|--------|
| `il_iec` | First sample | Israel utility (IEC) export — appendix below |
| other | Later | Own detector + parser module |

**Detect:** try known header signatures. If ambiguous, UI lets user pick format.  
**Implement:** one module per `format_id` under `apps/web` (e.g. `usage/formats/il_iec.ts`). Shared normalize → canonical pulses.

---

## Appendix: format `il_iec`

Israel utility export often has a messy preamble (customer name, address, contract, meter summary). **Parser ignores that.**

Detect data table by header row (exact Hebrew names):

| Header | Meaning |
|--------|---------|
| `קוד ומספר מונה` | Meter code + number |
| `סוג מונה` | Meter type |
| `תאריך` | Date |
| `מועד תחילת הפעימה` | Interval start time |
| `צריכה/ייצור בקוט"ש` | Import kWh |
| `הזרמה בקוט"ש` | Export kWh (may be empty) |

### Rules (`il_iec` only)

- Skip preamble / `___` lines until header match.
- CSV may quote fields; `קוט"ש` appears as doubled quotes inside quoted cells.
- Multi-meter: keep `meter_id`; v1 may sum all import pulses unless UI filters.
- Pulses often sub-hour (e.g. 15‑min).
- Typical file ≈ one billing period (~2 months).

### Open (`il_iec`)

**Still need** one *real* anonymized data row to confirm live IEC dumps.

**Assumed for synthetic fixture** (`apps/web/src/usage/formats/fixtures/il_iec_sample.csv`) until then:

| Field | Format |
|-------|--------|
| `תאריך` | `DD/MM/YYYY` |
| `מועד תחילת הפעימה` | `HH:MM` or `HH:MM:SS` |

Swap the fixture (and parser if needed) when a real sample lands.

---

## Adding a format later

1. Document headers + sample row in this file (new section).
2. Add detector (unique header fingerprint).
3. Map rows → canonical pulses.
4. Tests: sample CSV → expected hourly totals.
