import { de } from "@/i18n/de"
import { en, type Messages } from "@/i18n/en"

export type { Messages }
export type Locale = "en" | "de"

export const LOCALES: readonly Locale[] = ["en", "de"]
export const LOCALE_STORAGE_KEY = "locale"

export const MESSAGES: Record<Locale, Messages> = { en, de }

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "de"
}

/** Saved choice first, then the browser language ("de*" is German), else English. */
export function detectLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    // Storage can be blocked; fall through to the browser language.
  }
  return window.navigator.language.toLowerCase().startsWith("de") ? "de" : "en"
}

/** Statuses that exist in the dictionary; anything else falls back to its code. */
export function isKnownStatus(
  code: string
): code is keyof Messages["timeline"]["status"] {
  return Object.prototype.hasOwnProperty.call(en.timeline.status, code)
}

/** LOINC codes that have a localized name; anything else falls back to the API title. */
export function isKnownMeasurementCode(
  code: string
): code is keyof Messages["measurements"] {
  return Object.prototype.hasOwnProperty.call(en.measurements, code)
}

/** Category and Encounter class codes that have a localized label. */
export function isKnownCategoryCode(
  code: string
): code is keyof Messages["timeline"]["category"] {
  return Object.prototype.hasOwnProperty.call(en.timeline.category, code)
}
