import { useQuery } from "@apollo/client/react"
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  RotateCwIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { ObservationFlag } from "@/graphql/timeline"
import {
  PATIENT_TRENDS_QUERY,
  type Trend,
  type TrendPoint,
} from "@/graphql/trends"
import { useI18n } from "@/i18n/locale-provider"
import {
  isKnownTrendCode,
  type Locale,
  type Messages,
} from "@/i18n/messages"
import { dayKey, formatFhirDate, formatNumber } from "@/lib/format"

const BLOOD_PRESSURE = "85354-9"

const FLAG_META: Record<
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

type Datum = {
  time: number
  date: string
  value: number
  secondary: number | null
  flag: ObservationFlag | null
}

function trendTitle(trend: Trend, t: Messages): string {
  return isKnownTrendCode(trend.code) ? t.trends.names[trend.code] : trend.title
}

function toDatum(point: TrendPoint): Datum {
  return {
    time: Date.parse(point.date),
    date: point.date,
    value: point.value,
    secondary: point.secondaryValue,
    flag: point.flag,
  }
}

function withUnit(text: string, unit: string | null): string {
  return unit ? `${text} ${unit}` : text
}

/** "128/82 mmHg" for blood pressure, "7,1 %" otherwise. */
function formatReading(
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

function formatDay(value: string, locale: Locale): string {
  return formatFhirDate(dayKey(value), locale) ?? value
}

function allValues(points: readonly { value: number; secondary: number | null }[]) {
  return points.flatMap((p) =>
    p.secondary === null ? [p.value] : [p.value, p.secondary]
  )
}

function summarize(trend: Trend, t: Messages, locale: Locale): string {
  const first = trend.points[0]
  const last = trend.points[trend.points.length - 1]
  if (!first || !last) return trendTitle(trend, t)
  const values = allValues(
    trend.points.map((p) => ({ value: p.value, secondary: p.secondaryValue }))
  )
  const lo = formatNumber(Math.min(...values), locale)
  const hi = formatNumber(Math.max(...values), locale)
  return t.trends.summary(
    trendTitle(trend, t),
    trend.points.length,
    formatDay(first.date, locale),
    formatDay(last.date, locale),
    formatReading(trend, last, locale),
    withUnit(`${lo}–${hi}`, trend.unit)
  )
}

type DotProps = {
  cx?: number
  cy?: number
  payload?: Datum
  stroke?: string
}

/** Round dot; a flagged point is a larger diamond in the flag colour, so the shape carries the flag too. */
function makeDot(secondary: boolean) {
  return function Dot({ cx, cy, payload, stroke }: DotProps) {
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

const SystolicDot = makeDot(false)
const DiastolicDot = makeDot(true)

type TooltipBodyProps = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: Datum }>
  trend: Trend
}

function TrendTooltip({ active, payload, trend }: TooltipBodyProps) {
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

function TrendChart({ trend }: { trend: Trend }) {
  const { locale, t } = useI18n()
  const data = trend.points.map(toDatum)
  const isPressure = trend.code === BLOOD_PRESSURE
  const values = allValues(data)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.05 || 1
  const config: ChartConfig = {
    value: { label: t.trends.systolic, color: "var(--chart-2)" },
    secondary: { label: t.trends.diastolic, color: "var(--chart-2)" },
  }
  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-32 w-full"
      initialDimension={{ width: 320, height: 128 }}
    >
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickCount={3}
          padding={{ left: 8, right: 8 }}
          tickLine={false}
          tickMargin={6}
          tickFormatter={(time: number) =>
            formatDay(new Date(time).toISOString(), locale)
          }
        />
        <YAxis
          width={36}
          tickCount={3}
          axisLine={false}
          tickLine={false}
          domain={[min - pad, max + pad]}
          tickFormatter={(v: number) => formatNumber(v, locale, 0)}
        />
        <ChartTooltip
          isAnimationActive={false}
          content={<TrendTooltip trend={trend} />}
        />
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          isAnimationActive={false}
          dot={SystolicDot}
          activeDot={{ r: 5 }}
        />
        {isPressure ? (
          <Line
            dataKey="secondary"
            type="monotone"
            stroke="var(--color-secondary)"
            strokeWidth={2}
            strokeDasharray="5 3"
            isAnimationActive={false}
            dot={DiastolicDot}
            activeDot={{ r: 5 }}
          />
        ) : null}
      </LineChart>
    </ChartContainer>
  )
}

function TrendCard({ trend }: { trend: Trend }) {
  const { locale, t } = useI18n()
  const latest = trend.points[trend.points.length - 1]
  if (!latest) return null
  const flag = latest.flag ? FLAG_META[latest.flag] : null
  return (
    <li>
      <Card size="sm" className="h-full">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <h4 className="text-xs text-muted-foreground">
                {trendTitle(trend, t)}
              </h4>
              <p className="text-2xl font-semibold tabular-nums">
                {formatReading(trend, latest, locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDay(latest.date, locale)}
              </p>
            </div>
            {flag && latest.flag ? (
              <Badge variant={flag.variant}>
                <flag.icon data-icon="inline-start" />
                {t.timeline.flag[latest.flag]}
              </Badge>
            ) : null}
          </div>
          {trend.code === BLOOD_PRESSURE ? (
            <p className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-4 border-t-2 border-current"
                  aria-hidden="true"
                />
                {t.trends.systolic}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-4 border-t-2 border-dashed border-current"
                  aria-hidden="true"
                />
                {t.trends.diastolic}
              </span>
            </p>
          ) : null}
          <p className="sr-only">{summarize(trend, t, locale)}</p>
          <TrendChart trend={trend} />
        </CardContent>
      </Card>
    </li>
  )
}

type PatientTrendsProps = { patientId: string }

export function PatientTrends({ patientId }: PatientTrendsProps) {
  const { t } = useI18n()
  const { data, loading, error, refetch } = useQuery(PATIENT_TRENDS_QUERY, {
    variables: { id: patientId },
  })
  const trends = data?.patient?.trends ?? []
  const pending = loading && !data

  if (!error && !pending && trends.length === 0) return null

  return (
    <section className="flex flex-col gap-3" aria-labelledby="trends-heading">
      <h3 id="trends-heading" className="text-sm font-medium">
        {t.trends.title}
      </h3>
      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>{t.trends.loadError}</AlertTitle>
          <AlertAction>
            <Button size="xs" variant="outline" onClick={() => void refetch()}>
              <RotateCwIcon data-icon="inline-start" />
              {t.common.retry}
            </Button>
          </AlertAction>
        </Alert>
      ) : pending ? (
        <div
          className="grid gap-3 md:grid-cols-2"
          aria-busy="true"
          aria-label={t.trends.loading}
        >
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {trends.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </ul>
      )}
    </section>
  )
}
