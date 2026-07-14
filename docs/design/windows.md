# Time windows design

Parent: [../ARCHITECTURE.md](../ARCHITECTURE.md). Schema examples: [catalog.md](catalog.md). Scoring: [scoring.md](scoring.md).

## Rules

On each plan, `windows` is an ordered list. **First matching rule wins.**

**Per plan only.** No supplier-level clock. Same supplier may use different windows on different plans.

Times are `HH:MM` in the market **`timezone`** (IANA, from manifest). Convert to minutes-from-midnight: `00:00` → 0, `24:00` → 1440. **`end: "00:00"` is forbidden** (ambiguous). Always use `"24:00"` for end-of-day.

| Field | Meaning |
|-------|---------|
| `start` / `end` | `HH:MM`. `end` may be `"24:00"`. Never `"00:00"` as `end` |
| Interval | Half-open **`[start, end)`** in minutes |
| Same-day | `start < end` (e.g. `07:00`→`20:00`) → matches `start ≤ t < end` |
| Overnight wrap | `end < start` (e.g. `22:00`→`06:00`) → matches `t ≥ start` **or** `t < end` |
| `months` | Optional; `null` = all. 1 = January |
| `weekdays` | Optional; `null` = all. Index **0 = market `week_start`** (`sunday` → 0=Sun…6=Sat; `monday` → 0=Mon…6=Sun) |
| `discount_pct` | For `pct_off_flat` |
| `rate_per_kwh` | For `absolute_windows` (market `currency`) |

## Marketing clocks → published

Clocks like `00:01` / `07:01`: normalize at extract/merge to contiguous half-open edges (no one-minute gaps). Published catalog must not leave gaps.

## Coverage (catalog validate)

- For each `months`×`weekdays` slice the plan claims, windows must cover every minute of the day (0..1439) with no gaps.
- Plans with seasonal rules must also include a **catch-all** window (`months`/`weekdays` null, or explicit remaining slices) so every real timestamp matches.
- Overlaps OK (first match wins); gaps = reject publish.

## CSV → hourly then window

1. Parse meter pulses from CSV — [usage-csv.md](usage-csv.md).
2. **Aggregate to calendar hours** — floor pulse **start** to hour (`14:45` → `14:00`); sparse hours OK — [scoring.md](scoring.md).
3. Match each **hour start** to a plan window (first match).

v1 does not split kWh inside an hour across two windows; whole hour uses the window that contains `HH:00`. Prefer plan window `start`/`end` on whole hours (`:00`). Soft warning in catalog validate if edges are not `:00`.
