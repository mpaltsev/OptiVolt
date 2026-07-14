import { buildStore, requireMarketEntry } from "./build.js";
import type { Catalog, CatalogManifest } from "./types.js";
import type { CatalogStore } from "./store.js";
import manifest from "../../../../packages/catalog/manifest.json";
import catalogIl from "../../../../packages/catalog/il/catalog-2026-07-14.json";

/** Vite-bundled catalogs keyed by market id. */
const CATALOGS: Record<string, Catalog> = {
  il: catalogIl as Catalog,
};

/** Build a CatalogStore from Vite-imported JSON (browser-safe). */
export function loadBundledStore(marketId: string): CatalogStore {
  const typedManifest = manifest as CatalogManifest;
  const entry = requireMarketEntry(typedManifest, marketId);
  const catalog = CATALOGS[marketId];
  if (!catalog) {
    throw new Error(`No bundled catalog for market "${marketId}"`);
  }
  return buildStore(marketId, catalog, entry);
}
