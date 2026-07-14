# Usage CSV design (IL)

Parent: [../ARCHITECTURE.md](../ARCHITECTURE.md). Scoring: [scoring.md](scoring.md).

## Goal

Turn a usage file into a list of pulses the scorer can aggregate to **hours**.

Several CSV dialects exist. **IEC export is format #1 (v1).** Others added later as separate parsers — not by bending the IEC one.

## Canonical pulse (after parse)

Every format adapter must emit:

```text
{ meter_id?, timestamp, kwh_import, kwh_export? }
```

- `timestamp` — interval/pulse start, `Asia/Jerusalem`
- `kwh_import` — import for that pulse
- `kwh_export` — optional; ignored in score v1

Scorer then: pulses → hourly kWh (floor start to hour; sparse OK) → windows — [scoring.md](scoring.md).

Already-hourly files (one row per hour) are fine: adapter emits one pulse per hour; aggregate is identity.

Period-only totals (no time-of-day) → reject; cannot rank windowed plans.

## Format adapters

| `format_id` | Status | Notes |
|-------------|--------|--------|
| `iec` | **v1** | IEC / חח"י style export (Hebrew headers, preamble) — below |
| other | Later | Supplier portal exports, etc. Own detector + parser module |

**Detect:** try known header signatures (IEC first). If ambiguous, UI lets user pick format.  
**Implement:** one module per `format_id` under `apps/web` (e.g. `usage/formats/iec.ts`). Shared normalize → canonical pulses.

Do not stuff foreign columns into the IEC parser.

---

## Format: `iec` (v1)

IEC export often has a messy preamble (customer name, address, contract, meter summary). **Parser ignores that.**

Detect data table by header row (exact Hebrew names):

| Header | Meaning |
|--------|---------|
| `קוד ומספר מונה` | Meter code + number |
| `סוג מונה` | Meter type |
| `תאריך` | Date |
| `מועד תחילת הפעימה` | Interval start time |
| `צריכה/ייצור בקוט"ש` | Import kWh |
| `הזרמה בקוט"ש` | Export kWh (may be empty) |

### Rules (`iec` only)

- Skip preamble / `___` lines until header match.
- CSV may quote fields; `קוט"ש` appears as doubled quotes inside quoted cells.
- Multi-meter: keep `meter_id`; v1 may sum all import pulses unless UI filters.
- Pulses often sub-hour (e.g. 15‑min).
- Typical file ≈ one billing period (~2 months).

### Open (`iec`)

**Still need** one anonymized data row for exact `תאריך` / `מועד תחילת הפעימה` string formats.

---

## Adding a format later

1. Document headers + sample row in this file (new section).
2. Add detector (unique header fingerprint).
3. Map rows → canonical pulses.
4. Tests: sample CSV → expected hourly totals.
