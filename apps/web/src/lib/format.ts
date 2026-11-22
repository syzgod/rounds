import type { Gender } from "@/graphql/patients"
import type { Locale, Messages } from "@/i18n/messages"

/** Intl locales: en-GB gives "10 Dec 1985", de-DE gives "10.12.1985"; both use 24h time. */
const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", de: "de-DE" }

export function formatGender(
  gender: Gender | null,
  t: Messages
): string | null {
  return gender ? t.sex[gender] : null
}

export function formatGenderShort(
  gender: Gender | null,
  t: Messages
): string | null {
  return gender ? t.sexShort[gender] : null
}

type FhirDateParts = { year: number; month: number | null; day: number | null }

/** Parses a FHIR `date` (YYYY, YYYY-MM or YYYY-MM-DD); null when malformed. */
export function parseFhirDate(value: string | null): FhirDateParts | null {
  if (!value) return null
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  return {
    year: Number(year),
    month: month ? Number(month) : null,
    day: day ? Number(day) : null,
  }
}

/**
 * Whole years between a FHIR birth date and `now`. Partial dates count from
 * the start of the known period, so a year-only date can overstate by one.
 */
export function ageInYears(
  birthDate: string | null,
  now: Date = new Date()
): number | null {
  const parts = parseFhirDate(birthDate)
  if (!parts) return null
  const month = parts.month ?? 1
  const day = parts.day ?? 1
  let age = now.getFullYear() - parts.year
  const beforeBirthday =
    now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day)
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * Clinical display format by precision. en: "10 Dec 1985", "Dec 1985", "1985";
 * de: "10.12.1985", "12.1985", "1985". Formatted in UTC from the calendar
 * parts, so a date-only value never shifts with the time zone.
 */
export function formatFhirDate(
  value: string | null,
  locale: Locale
): string | null {
  const parts = parseFhirDate(value)
  if (!parts) return value
  if (!parts.month) return String(parts.year)
  const date = new Date(0)
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day ?? 1)
  const numeric = locale === "de"
  // Intl has no "MM.YYYY" pattern for German month-only dates (it yields "04/2016").
  if (numeric && !parts.day) return `${pad(parts.month)}.${parts.year}`
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    year: "numeric",
    month: numeric ? "2-digit" : "short",
    ...(parts.day ? { day: numeric ? "2-digit" : "numeric" } : {}),
  }
  // en-GB writes September as "Sept"; clinical records use three letters.
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], options)
    .formatToParts(date)
    .map((part) =>
      part.type === "month" && part.value === "Sept" ? "Sep" : part.value
    )
    .join("")
}

/** Up to two initials from the first and last word of a name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

function localDate(value: string): Date | null {
  if (!value.includes("T")) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : new Date(ms)
}

/**
 * Calendar-day key for grouping: "YYYY-MM-DD" in local time for dateTimes;
 * FHIR dates ("2019-05-02", "2016-04") are kept as-is, never shifted by time zone.
 */
export function dayKey(value: string | null): string | null {
  if (!value) return null
  const date = localDate(value)
  if (date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  return parseFhirDate(value) ? value : null
}

/** Local 24h "HH:MM" for a FHIR dateTime; null for date-only values. */
export function formatTime(
  value: string | null,
  locale: Locale
): string | null {
  const date = value ? localDate(value) : null
  if (!date) return null
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)
}

/** "21:10–21:45", "21:10 – 4 Feb 2025 01:30", or the start time alone. */
export function formatTimeRange(
  start: string | null,
  end: string | null,
  locale: Locale,
  t: Messages
): string | null {
  const startTime = formatTime(start, locale)
  if (!end) return startTime
  const endTime = formatTime(end, locale)
  if (startTime && endTime && dayKey(start) === dayKey(end)) {
    return `${startTime}–${endTime}`
  }
  const endLabel = [formatFhirDate(dayKey(end), locale), endTime]
    .filter((part): part is string => part !== null)
    .join(" ")
  return startTime ? `${startTime} – ${endLabel}` : t.common.until(endLabel)
}

/** Locale-aware number with at most `digits` decimals: en "7.1", de "7,1". */
export function formatNumber(
  value: number,
  locale: Locale,
  digits = 1,
  minDigits = 0
): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: digits,
  }).format(value)
}
