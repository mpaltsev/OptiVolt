import { describe, expect, it } from "vitest";
import { loadBundledStore } from "./bundled.js";

describe("loadBundledStore", () => {
  it("loads IL catalog without Node fs", () => {
    const store = loadBundledStore("il");
    expect(store.market).toBe("il");
    expect(store.suppliers.length).toBeGreaterThan(0);
    expect(store.defaultSupplier().id).toBe("iec");
    expect(store.plansForSupplier("iec").some((p) => p.id === "iec-flat")).toBe(
      true,
    );
  });
});
