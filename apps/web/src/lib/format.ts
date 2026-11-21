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
