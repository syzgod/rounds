import {
  ArrowDownIcon,
  ArrowUpIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"

import type { ObservationFlag } from "@/graphql/timeline"
import type { Trend, TrendPoint } from "@/graphql/trends"
import { useI18n } from "@/i18n/locale-provider"
import {
  isKnownMeasurementCode,
  type Locale,
  type Messages,
} from "@/i18n/messages"
import { dayKey, formatFhirDate, formatNumber } from "@/lib/format"

export const BLOOD_PRESSURE = "85354-9"

export const FLAG_META: Record<
  ObservationFlag,
  { icon: LucideIcon; variant: "warning" | "destructive"; color: string }
> = {
  LOW: { icon: ArrowDownIcon, variant: "warning", color: "var(--warning)" },
  HIGH: {
    icon: ArrowUpIcon,
    variant: "destructive",
    color: "var(--destructive)",
  },
  ABNORMAL: {
    icon: TriangleAlertIcon,
    variant: "warning",
    color: "var(--warning)",
  },
}

export type Datum = {
  time: number
  date: string
  value: number
  secondary: number | null
  flag: ObservationFlag | null
}

export type Band = { low: number | null; high: number | null }

export function trendTitle(trend: Trend, t: Messages): string {
  return isKnownMeasurementCode(trend.code)
    ? t.measurements[trend.code]
    : trend.title
}

export function toDatum(point: TrendPoint): Datum {
  return {
    time: Date.parse(point.date),
    date: point.date,
    value: point.value,
    secondary: point.secondaryValue,
    flag: point.flag,
  }
}

export function withUnit(text: string, unit: string | null): string {
  return unit ? `${text} ${unit}` : text
}

/** "128/82 mmHg" for blood pressure, "7,1 %" otherwise. */
export function formatReading(
  trend: Trend,
  point: Pick<TrendPoint, "value" | "secondaryValue">,
  locale: Locale
): string {
  const main = formatNumber(point.value, locale)
  const text =
    trend.code === BLOOD_PRESSURE && point.secondaryValue !== null
      ? `${main}/${formatNumber(point.secondaryValue, locale)}`
      : main
  return withUnit(text, trend.unit)
}

export function formatDay(value: string, locale: Locale): string {
  return formatFhirDate(dayKey(value), locale) ?? value
}

/** Month and year only ("03.2023", "Mar 2023"). */
export function formatMonth(value: string, locale: Locale): string {
  const key = dayKey(value)
  return formatFhirDate(key ? key.slice(0, 7) : null, locale) ?? value
}

export function allValues(
  points: readonly { value: number; secondary: number | null }[]
) {
  return points.flatMap((p) =>
    p.secondary === null ? [p.value] : [p.value, p.secondary]
  )
}

/** The systolic (or only) and diastolic normal ranges; null when a range is unknown. */
export function trendBands(trend: Trend): {
  primary: Band | null
  secondary: Band | null
} {
  const primary =
    trend.referenceLow === null && trend.referenceHigh === null
      ? null
      : { low: trend.referenceLow, high: trend.referenceHigh }
  const secondary =
    trend.secondaryReferenceLow === null &&
    trend.secondaryReferenceHigh === null
      ? null
      : { low: trend.secondaryReferenceLow, high: trend.secondaryReferenceHigh }
  return { primary, secondary }
}

function decimals(values: readonly number[]): number {
  return values.some((v) => !Number.isInteger(v)) ? 1 : 0
}

/** "4,0–5,6", "≥ 4", "≤ 5,6"; null for an empty band. */
export function formatBand(
  band: Band,
  locale: Locale,
  shared: readonly number[] = []
): string | null {
  const present = [band.low, band.high, ...shared].filter(
    (v): v is number => v !== null
  )
  const digits = decimals(present)
  const fmt = (v: number) => formatNumber(v, locale, digits, digits)
  if (band.low !== null && band.high !== null) {
    return `${fmt(band.low)}–${fmt(band.high)}`
  }
  if (band.low !== null) return `≥ ${fmt(band.low)}`
  if (band.high !== null) return `≤ ${fmt(band.high)}`
  return null
}

/** "90–120/60–80" for blood pressure with both ranges, else the single range. */
export function formatNorm(trend: Trend, locale: Locale): string | null {
  const { primary, secondary } = trendBands(trend)
  if (!primary) return null
  const main = formatBand(primary, locale)
  if (!main) return null
  const second = secondary ? formatBand(secondary, locale) : null
  return withUnit(second ? `${main}/${second}` : main, trend.unit)
}

/** True when the value lies within the band, false when outside. */
export function inBand(band: Band, value: number): boolean {
  return (
    (band.low === null || value >= band.low) &&
    (band.high === null || value <= band.high)
  )
}

type DotProps = {
  cx?: number
  cy?: number
  index?: number
  payload?: Datum
  stroke?: string
}

type DotOptions = {
  /** Diastolic line: hollow dots. */
  secondary: boolean
  /** Index of the latest point; it always gets a dot. */
  lastIndex: number
  /** Dot on every point (dialog), not only the latest (card). */
  everyPoint?: boolean
}

/** Flagged points are diamonds in the flag colour; other points get a dot per `DotOptions`. */
export function makeDot({
  secondary,
  lastIndex,
  everyPoint = false,
}: DotOptions) {
  return function Dot({ cx, cy, index, payload, stroke }: DotProps) {
    if (cx === undefined || cy === undefined) return <g />
    const flag = payload?.flag ?? null
    if (flag) {
      return (
        <rect
          x={cx - 4.5}
          y={cy - 4.5}
          width={9}
          height={9}
          transform={`rotate(45 ${cx} ${cy})`}
          fill={FLAG_META[flag].color}
          stroke="var(--background)"
          strokeWidth={1.5}
        />
      )
    }
    if (!everyPoint && index !== lastIndex) return <g />
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={secondary ? "var(--background)" : stroke}
        stroke={stroke}
        strokeWidth={1.5}
      />
    )
  }
}

/**
 * Round y-axis ticks that cover `lo`..`hi`: steps of 1, 2, 2.5 or 5 × 10ⁿ,
 * at most `maxTicks` + 1 ticks. The first and last tick are the axis domain.
 */
export function niceTicks(lo: number, hi: number, maxTicks = 6): number[] {
  const spread = hi - lo || Math.abs(hi) * 0.1 || 1
  const raw = spread / (maxTicks - 1)
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 2.5, 5, 10]
      .map((m) => m * magnitude)
      .find((candidate) => candidate >= raw) ?? 10 * magnitude
  const start = Math.floor(lo / step) * step
  const end = Math.max(Math.ceil(hi / step) * step, start + step)
  const ticks: number[] = []
  // toFixed removes float noise such as 0.30000000000000004.
  for (let v = start; v <= end + step / 2; v += step) {
    ticks.push(Number(v.toFixed(10)))
  }
  return ticks
}

type TooltipBodyProps = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: Datum }>
  trend: Trend
}

/** Chart tooltip: date, reading and flag of the hovered point. */
export function TrendTooltip({ active, payload, trend }: TooltipBodyProps) {
  const { locale, t } = useI18n()
  const datum = payload?.[0]?.payload
  if (!active || !datum) return null
  return (
    <div className="grid gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="text-muted-foreground">
        {formatDay(datum.date, locale)}
      </div>
      <div className="font-medium tabular-nums">
        {formatReading(
          trend,
          { value: datum.value, secondaryValue: datum.secondary },
          locale
        )}
      </div>
      {datum.flag ? (
        <div className="font-medium">{t.timeline.flag[datum.flag]}</div>
      ) : null}
    </div>
  )
}
