import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UsageAggregator } from "../aggregate.js";
import {
  detectUsageFormat,
  parseCsvLine,
  parseIlIec,
} from "./il_iec.js";

const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/il_iec_sample.csv",
);

describe("il_iec", () => {
  const csv = readFileSync(fixturePath, "utf8");

  it("detects from Hebrew headers with doubled quotes", () => {
    expect(detectUsageFormat(csv).formatId).toBe("il_iec");
  });

  it("parses preamble + sub-hour pulses into civil fields", () => {
    const pulses = parseIlIec(csv);
    expect(pulses).toHaveLength(6);
    expect(pulses[0]).toEqual({
      year: 2026,
      month: 7,
      day: 14,
      hour: 0,
      minute: 0,
      kwhImport: 0.1,
    });
    expect(pulses[2]?.hour).toBe(1);
    expect(pulses[2]?.minute).toBe(0);
  });

  it("aggregates multi-meter hours", () => {
    const hours = new UsageAggregator().toHours(parseIlIec(csv));
    const h0 = hours.find(
      (h) => h.year === 2026 && h.month === 7 && h.day === 14 && h.hour === 0,
    );
    expect(h0?.kwh).toBeCloseTo(0.3);
    const h2 = hours.find(
      (h) => h.year === 2026 && h.month === 7 && h.day === 15 && h.hour === 2,
    );
    expect(h2?.kwh).toBeCloseTo(0.4);
  });

  it("parses quoted CSV with doubled quotes", () => {
    const cells = parseCsvLine(
      '"a","צריכה/ייצור בקוט""ש","c"',
    );
    expect(cells[1]).toBe('צריכה/ייצור בקוט"ש');
  });
});
