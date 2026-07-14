import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCatalogMarket,
  buildStore,
  requireMarketEntry,
} from "./build.js";
import type { Catalog, CatalogManifest, MarketManifestEntry } from "./types.js";
import { CatalogStore } from "./store.js";

export { CatalogStore } from "./store.js";

/**
 * Loads catalogs from packages/catalog via manifest + market id.
 * Browser SPA uses `loadBundledStore` (Vite JSON imports) instead.
 */
export class CatalogLoader {
  private readonly catalogPackageRoot: string;

  constructor(catalogPackageRoot?: string) {
    this.catalogPackageRoot =
      catalogPackageRoot ??
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../../../packages/catalog",
      );
  }

  loadManifest(): CatalogManifest {
    return this.readJson<CatalogManifest>("manifest.json");
  }

  marketEntry(marketId: string): MarketManifestEntry {
    return requireMarketEntry(this.loadManifest(), marketId);
  }

  loadMarket(marketId: string): Catalog {
    return this.loadCatalogFile(marketId, this.marketEntry(marketId));
  }

  /** Dated catalog + stable market config from manifest. */
  loadStore(marketId: string): CatalogStore {
    const entry = this.marketEntry(marketId);
    return buildStore(marketId, this.loadCatalogFile(marketId, entry), entry);
  }

  private loadCatalogFile(
    marketId: string,
    entry: MarketManifestEntry,
  ): Catalog {
    const catalog = this.readJson<Catalog>(entry.catalog);
    assertCatalogMarket(marketId, catalog);
    return catalog;
  }

  private readJson<T>(relativePath: string): T {
    const absolutePath = path.join(this.catalogPackageRoot, relativePath);
    return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
  }
}
