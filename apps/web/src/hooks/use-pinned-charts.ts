import { useCallback, useState } from "react"

import type { Trend } from "@/graphql/trends"

const STORAGE_KEY = "pinnedCharts"
const DEFAULT_COUNT = 3

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

/** Saved LOINC codes; null when the user never pinned (or storage is blocked). */
function readPins(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw === null ? null : JSON.parse(raw)
    return isStringArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Without saved pins: flagged series first, then the rest, at most 3. */
export function defaultPins(trends: readonly Trend[]): string[] {
  const flagged = (trend: Trend) => trend.points.at(-1)?.flag != null
  return [...trends.filter(flagged), ...trends.filter((t) => !flagged(t))]
    .slice(0, DEFAULT_COUNT)
    .map((trend) => trend.code)
}

/**
 * Charts pinned to the overview, by LOINC code, saved per browser: a code
 * pinned once stays pinned for every patient.
 */
export function usePinnedCharts(): {
  /** The pinned codes, or null when the user never pinned. */
  pins: string[] | null
  toggle: (code: string, current: readonly string[]) => void
} {
  const [pins, setPins] = useState<string[] | null>(readPins)

  // `current` is what the overview shows now (defaults included), so the
  // first pin keeps the default charts instead of replacing them all.
  const toggle = useCallback((code: string, current: readonly string[]) => {
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code]
    setPins(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage can be blocked; the pins then last for this session only.
    }
  }, [])

  return { pins, toggle }
}
