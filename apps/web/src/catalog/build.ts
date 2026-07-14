import type {
  Catalog,
  CatalogManifest,
  MarketManifestEntry,
} from "./types.js";
import { CatalogStore } from "./store.js";

/** Resolve market config from a manifest (shared by Node + Vite loaders). */
export function requireMarketEntry(
  manifest: CatalogManifest,
  marketId: string,
): MarketManifestEntry {
  const entry = manifest.markets[marketId];
  if (!entry) {
    throw new Error(
      `Unknown market "${marketId}". Known: ${Object.keys(manifest.markets).join(", ")}`,
    );
  }
  return entry;
}

export function assertCatalogMarket(marketId: string, catalog: Catalog): void {
  if (catalog.market !== marketId) {
    throw new Error(
      `Catalog market "${catalog.market}" does not match manifest key "${marketId}"`,
    );
  }
}

/** Assert catalog.market matches manifest key, then wrap store. */
export function buildStore(
  marketId: string,
  catalog: Catalog,
  entry: MarketManifestEntry,
): CatalogStore {
  assertCatalogMarket(marketId, catalog);
  return new CatalogStore(marketId, catalog, entry);
}
