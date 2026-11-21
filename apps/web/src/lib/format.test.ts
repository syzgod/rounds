import { describe, expect, it } from "vitest"

import {
  ageInYears,
  formatFhirDate,
  formatGender,
  formatGenderShort,
  initials,
  parseFhirDate,
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
    expect(formatFhirDate("1985-12-10")).toBe("10 Dec 1985")
    expect(formatFhirDate("2016-04")).toBe("Apr 2016")
    expect(formatFhirDate("1985")).toBe("1985")
    expect(formatFhirDate(null)).toBeNull()
  })

  it("passes through values it cannot parse", () => {
    expect(formatFhirDate("not-a-date")).toBe("not-a-date")
    expect(parseFhirDate("not-a-date")).toBeNull()
  })
})

describe("gender and initials", () => {
  it("labels genders", () => {
    expect(formatGender("FEMALE")).toBe("Female")
    expect(formatGenderShort("MALE")).toBe("M")
    expect(formatGender(null)).toBeNull()
  })

  it("takes the first and last initial", () => {
    expect(initials("Amelia Rose Hartwell")).toBe("AH")
    expect(initials("Okafor")).toBe("O")
    expect(initials("  ")).toBe("")
  })
})
