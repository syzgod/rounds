import { describe, expect, it } from "vitest"

import { de } from "@/i18n/de"
import { en } from "@/i18n/en"

import {
  ageInYears,
  formatFhirDate,
  formatGender,
  formatGenderShort,
  initials,
  parseFhirDate,
  dayKey,
  formatTime,
  formatTimeRange,
} from "@/lib/format"

const NOW = new Date(2025, 5, 15) // 15 Jun 2025, local time

describe("ageInYears", () => {
  it("counts whole years and respects the birthday", () => {
    expect(ageInYears("1985-12-10", NOW)).toBe(39)
    expect(ageInYears("1985-06-15", NOW)).toBe(40)
    expect(ageInYears("1985-06-16", NOW)).toBe(39)
  })

  it("handles partial FHIR dates and missing or malformed values", () => {
    expect(ageInYears("1985", NOW)).toBe(40)
    expect(ageInYears("1985-07", NOW)).toBe(39)
    expect(ageInYears(null, NOW)).toBeNull()
    expect(ageInYears("10/12/1985", NOW)).toBeNull()
    expect(ageInYears("2030-01-01", NOW)).toBeNull()
  })
})

describe("formatFhirDate", () => {
  it("formats full, month and year precision", () => {
    expect(formatFhirDate("1985-12-10", "en")).toBe("10 Dec 1985")
    expect(formatFhirDate("2016-04", "en")).toBe("Apr 2016")
    expect(formatFhirDate("1985", "en")).toBe("1985")
    expect(formatFhirDate(null, "en")).toBeNull()
  })

  it("formats German as numeric dates", () => {
    expect(formatFhirDate("1985-12-10", "de")).toBe("10.12.1985")
    expect(formatFhirDate("2019-05-02", "de")).toBe("02.05.2019")
    expect(formatFhirDate("2016-04", "de")).toBe("04.2016")
    expect(formatFhirDate("1985", "de")).toBe("1985")
  })

  it("passes through values it cannot parse", () => {
    expect(formatFhirDate("not-a-date", "de")).toBe("not-a-date")
    expect(parseFhirDate("not-a-date")).toBeNull()
  })
})

describe("gender and initials", () => {
  it("labels genders", () => {
    expect(formatGender("FEMALE", en)).toBe("Female")
    expect(formatGender("MALE", de)).toBe("Männlich")
    expect(formatGenderShort("FEMALE", de)).toBe("W")
    expect(formatGenderShort("MALE", en)).toBe("M")
    expect(formatGender(null, en)).toBeNull()
  })

  it("takes the first and last initial", () => {
    expect(initials("Amelia Rose Hartwell")).toBe("AH")
    expect(initials("Okafor")).toBe("O")
    expect(initials("  ")).toBe("")
  })
})

describe("dayKey / formatTime / formatTimeRange (TZ=UTC in tests)", () => {
  it("keys dateTimes by local day and keeps FHIR dates unshifted", () => {
    expect(dayKey("2025-02-03T21:25:00Z")).toBe("2025-02-03")
    expect(dayKey("2019-05-02")).toBe("2019-05-02")
    expect(dayKey("2016-04")).toBe("2016-04")
    expect(dayKey("garbage")).toBeNull()
    expect(dayKey(null)).toBeNull()
  })

  it("formats times and ranges", () => {
    expect(formatTime("2025-02-03T21:25:00Z", "en")).toBe("21:25")
    expect(formatTime("2025-02-03T21:25:00Z", "de")).toBe("21:25")
    expect(formatTime("2025-02-03T00:05:00Z", "en")).toBe("00:05")
    expect(formatTime("2019-05-02", "en")).toBeNull()
    expect(
      formatTimeRange("2024-01-09T14:30:00Z", "2024-01-09T15:00:00Z", "en", en)
    ).toBe("14:30–15:00")
    expect(
      formatTimeRange("2025-02-03T21:10:00Z", "2025-02-04T01:30:00Z", "en", en)
    ).toBe("21:10 – 4 Feb 2025 01:30")
    expect(
      formatTimeRange("2025-02-03T21:10:00Z", "2025-02-04T01:30:00Z", "de", de)
    ).toBe("21:10 – 04.02.2025 01:30")
    expect(formatTimeRange("2024-11-18", "2024-12-02", "en", en)).toBe(
      "until 2 Dec 2024"
    )
    expect(formatTimeRange("2024-11-18", "2024-12-02", "de", de)).toBe(
      "bis 02.12.2024"
    )
    expect(formatTimeRange("2024-05-11T16:50:00Z", null, "en", en)).toBe(
      "16:50"
    )
  })
})
