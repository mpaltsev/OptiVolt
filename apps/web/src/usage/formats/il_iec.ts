import type { Pulse } from "../aggregate.js";

export const IL_IEC_FORMAT_ID = "il_iec";

/** Exact Hebrew header names from IEC export (usage-csv.md). */
export const IL_IEC_HEADERS = [
  "קוד ומספר מונה",
  "סוג מונה",
  "תאריך",
  "מועד תחילת הפעימה",
  'צריכה/ייצור בקוט"ש',
  'הזרמה בקוט"ש',
] as const;

/**
 * Assumed cell formats until a real anonymized row lands:
 * date `DD/MM/YYYY`, time `HH:MM` or `HH:MM:SS` (see usage-csv.md).
 */
const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export type FormatId = typeof IL_IEC_FORMAT_ID;

export type DetectResult =
  | { formatId: FormatId; confidence: "exact" }
  | { formatId: null; confidence: "none" };

/** True when a CSV row contains all required il_iec headers. */
export function looksLikeIlIec(text: string): boolean {
  for (const line of text.split(/\r?\n/)) {
    const cells = parseCsvLine(line);
    if (cellsMatchHeaders(cells)) return true;
  }
  return false;
}

export function detectUsageFormat(text: string): DetectResult {
  if (looksLikeIlIec(text)) {
    return { formatId: IL_IEC_FORMAT_ID, confidence: "exact" };
  }
  return { formatId: null, confidence: "none" };
}

export function parseIlIec(text: string): Pulse[] {
  const lines = text.split(/\r?\n/);
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i] ?? "");
    if (cellsMatchHeaders(cells)) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex < 0) {
    throw new Error("il_iec: header row not found");
  }

  const header = parseCsvLine(lines[headerIndex] ?? "");
  const col = indexColumns(header);
  const pulses: Pulse[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (!raw.trim() || raw.includes("___")) continue;
    const cells = parseCsvLine(raw);
    if (cells.length < 5) continue;

    const dateRaw = cells[col.date] ?? "";
    const timeRaw = cells[col.time] ?? "";
    const kwhRaw = (cells[col.importKwh] ?? "").trim();
    if (!dateRaw || !timeRaw) continue;
    if (kwhRaw === "") continue;

    const civil = parseCivilDateTime(dateRaw, timeRaw);
    const kwhImport = Number(kwhRaw.replace(",", "."));
    if (!Number.isFinite(kwhImport)) {
      throw new Error(`il_iec: bad kWh at line ${i + 1}: ${kwhRaw}`);
    }

    pulses.push({
      year: civil.year,
      month: civil.month,
      day: civil.day,
      hour: civil.hour,
      minute: civil.minute,
      kwhImport,
    });
  }

  if (pulses.length === 0) {
    throw new Error("il_iec: no time-stamped usage rows found");
  }
  return pulses;
}

function cellsMatchHeaders(cells: string[]): boolean {
  const normalized = cells.map(normalizeHeader);
  return IL_IEC_HEADERS.every((h) => normalized.includes(normalizeHeader(h)));
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/\uFEFF/g, "");
}

function indexColumns(header: string[]): {
  date: number;
  time: number;
  importKwh: number;
} {
  const norm = header.map(normalizeHeader);
  const date = norm.indexOf(normalizeHeader(IL_IEC_HEADERS[2]));
  const time = norm.indexOf(normalizeHeader(IL_IEC_HEADERS[3]));
  const importKwh = norm.indexOf(normalizeHeader(IL_IEC_HEADERS[4]));
  if (date < 0 || time < 0 || importKwh < 0) {
    throw new Error("il_iec: required columns missing");
  }
  return { date, time, importKwh };
}

function parseCivilDateTime(
  dateRaw: string,
  timeRaw: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const dateMatch = DATE_RE.exec(dateRaw.trim());
  if (!dateMatch) {
    throw new Error(`il_iec: bad date "${dateRaw}" (want DD/MM/YYYY)`);
  }
  const timeMatch = TIME_RE.exec(timeRaw.trim());
  if (!timeMatch) {
    throw new Error(`il_iec: bad time "${timeRaw}" (want HH:MM[:SS])`);
  }
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new Error(`il_iec: out-of-range date/time ${dateRaw} ${timeRaw}`);
  }
  return { year, month, day, hour, minute };
}

/** RFC-ish CSV field split; handles quotes and doubled `"` inside fields. */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}
