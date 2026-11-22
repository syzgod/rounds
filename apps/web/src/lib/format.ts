import type { Gender } from "@/graphql/patients"

const GENDER_LABELS: Record<Gender, string> = {
  FEMALE: "Female",
  MALE: "Male",
  OTHER: "Other",
  UNKNOWN: "Unknown",
}

const GENDER_SHORT: Record<Gender, string> = {
  FEMALE: "F",
  MALE: "M",
  OTHER: "O",
  UNKNOWN: "U",
}

export function formatGender(gender: Gender | null): string | null {
  return gender ? GENDER_LABELS[gender] : null
}

export function formatGenderShort(gender: Gender | null): string | null {
  return gender ? GENDER_SHORT[gender] : null
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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** Clinical display format: "10 Dec 1985", "Dec 1985" or "1985". */
export function formatFhirDate(value: string | null): string | null {
  const parts = parseFhirDate(value)
  if (!parts) return value
  const month = parts.month ? MONTHS[parts.month - 1] : undefined
  if (!month) return String(parts.year)
  return parts.day
    ? `${parts.day} ${month} ${parts.year}`
    : `${month} ${parts.year}`
}

/** Up to two initials from the first and last word of a name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

const pad = (n: number) => String(n).padStart(2, "0")

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

/** Local "HH:MM" for a FHIR dateTime; null for date-only values. */
export function formatTime(value: string | null): string | null {
  const date = value ? localDate(value) : null
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : null
}

/** "21:10–21:45", "21:10 – 4 Feb 2025 01:30", or the start time alone. */
export function formatTimeRange(
  start: string | null,
  end: string | null
): string | null {
  const startTime = formatTime(start)
  if (!end) return startTime
  const endTime = formatTime(end)
  if (startTime && endTime && dayKey(start) === dayKey(end)) {
    return `${startTime}–${endTime}`
  }
  const endLabel = [formatFhirDate(dayKey(end)), endTime]
    .filter((part): part is string => part !== null)
    .join(" ")
  return startTime ? `${startTime} – ${endLabel}` : `until ${endLabel}`
}
