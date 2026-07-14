# Apps design

Parent: [../ARCHITECTURE.md](../ARCHITECTURE.md).

## User app (`apps/web`)

- Stack: TypeScript + **Vite + React** (static SPA).
- **No server.** CSV parsed and scored in the browser.
- Catalog bundled at build via `manifest.json`.
- Privacy: usage never uploaded.
- Flow: CSV (format detect / pick) → supplier → plan → ranked table — [scoring.md](scoring.md), [usage-csv.md](usage-csv.md).
- Usage parsers: one module per format; v1 ships **`iec`** only.
- Host: Cloudflare Pages / GitHub Pages.

## Extract tool (`tools/extract`)

- Scope: **private supplier plans only** (not IEC).
- Stack: Python + local LLM (e.g. Ollama).
- Pipeline: fetch or accept file → chunk → LLM structured plan JSON (incl. `windows`) → **window coverage validate** ([windows.md](windows.md)) → draft → human merge into `catalog-*.json`.
- Reject / flag draft if windows have gaps or forbidden `end: "00:00"`.
- Marketing clocks normalized to contiguous half-open edges before validate.
- Never invent IEC flat/TAOz; never pick the winner for users.

Draft-only flags stripped on merge into the published catalog — [catalog.md](catalog.md). Same coverage rules apply on merge/CI for published catalogs.
