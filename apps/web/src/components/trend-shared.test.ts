import { describe, expect, it } from "vitest"

import { niceTicks } from "@/components/trend-shared"

describe("niceTicks", () => {
  it("rounds HbA1c with its normal band to whole percent", () => {
    expect(niceTicks(3.81, 7.99)).toEqual([3, 4, 5, 6, 7, 8])
  })

  it("uses steps of 20 for blood pressure", () => {
    expect(niceTicks(55.6, 152.4)).toEqual([40, 60, 80, 100, 120, 140, 160])
  })

  it("has no float noise in decimal steps", () => {
    expect(niceTicks(0.1, 0.3)).toEqual([0.1, 0.15, 0.2, 0.25, 0.3])
  })

  it("still gives two ticks when all values are equal", () => {
    expect(niceTicks(5, 5)).toEqual([5, 5.1])
  })
})
