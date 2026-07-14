import { describe, expect, it } from "vitest";
import { CatalogLoader } from "./load.js";

describe("CatalogLoader", () => {
  const loader = new CatalogLoader();

  it("loads market catalog and default supplier from manifest", () => {
    const store = loader.loadStore("il");
    expect(store.market).toBe("il");
    expect(store.currency()).toBe("ILS");
    expect(store.timezone()).toBe("Asia/Jerusalem");
    expect(store.weekStart()).toBe("sunday");
    expect(store.defaultSupplier().id).toBe("iec");
    expect(store.defaultSupplier().default_plan_id).toBe("iec-taoz");
    expect(store.baseFlatRatePerKwh()).toBeGreaterThan(0);
  });

  it("rejects unknown market", () => {
    expect(() => loader.loadMarket("xx")).toThrow(/Unknown market/);
  });
});
