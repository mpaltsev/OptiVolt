import { en } from "./en.js";
import { he } from "./he.js";
import type { MessageKey } from "./keys.js";

export type { MessageKey, Messages } from "./keys.js";
export { MESSAGE_KEYS } from "./keys.js";

/** Locale strings — UI only; parser/format ids stay English codes. */

export type Locale = "en" | "he";

export const LOCALES: { id: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { id: "en", label: "English", dir: "ltr" },
  { id: "he", label: "עברית", dir: "rtl" },
];

const messages = { en, he };

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  let text: string = messages[locale][key] ?? messages.en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return LOCALES.find((l) => l.id === locale)?.dir ?? "ltr";
}
