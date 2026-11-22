import { useState } from "react"
import { useQuery } from "@apollo/client/react"
import { AlertCircleIcon, PinIcon, RotateCwIcon } from "lucide-react"
import { Line, LineChart, ReferenceArea, YAxis } from "recharts"

import { PatientTrendsSkeleton } from "@/components/patient-trends-skeleton"
import {
  allValues,
  BLOOD_PRESSURE,
  FLAG_META,
  makeDot,
  TrendTooltip,
  formatDay,
  formatMonth,
  formatNorm,
  formatReading,
  toDatum,
  trendBands,
  trendTitle,
  withUnit,
  type Band,
} from "@/components/trend-shared"
import { TrendDetailDialog } from "@/components/trend-detail-dialog"
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { PATIENT_TRENDS_QUERY, type Trend } from "@/graphql/trends"
import { defaultPins, usePinnedCharts } from "@/hooks/use-pinned-charts"
import { useI18n } from "@/i18n/locale-provider"
import type { Locale, Messages } from "@/i18n/messages"
import { formatNumber } from "@/lib/format"

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

function TrendChart({ trend }: { trend: Trend }) {
  const { locale, t } = useI18n()
  const data = trend.points.map(toDatum)
  const isPressure = trend.code === BLOOD_PRESSURE
  const { primary, secondary } = trendBands(trend)
  const values = allValues(data)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const bandEdges = [primary, secondary].flatMap((b) =>
    b ? [b.low, b.high].filter((v): v is number => v !== null) : []
  )
  const lo = Math.min(min, ...bandEdges)
  const hi = Math.max(max, ...bandEdges)
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.05 || 1
  const domain: [number, number] = [lo - pad, hi + pad]
  const config: ChartConfig = {
    value: { label: t.trends.systolic, color: "var(--observation)" },
    secondary: { label: t.trends.diastolic, color: "var(--observation)" },
  }
  const lastIndex = data.length - 1
  const SystolicDot = makeDot({ secondary: false, lastIndex })
  const DiastolicDot = makeDot({ secondary: true, lastIndex })
  const first = trend.points[0]
  const last = trend.points[lastIndex]
  const band = (b: Band | null, key: string) =>
    b ? (
      <ReferenceArea
        key={key}
        y1={b.low ?? domain[0]}
        y2={b.high ?? domain[1]}
        fill="var(--observation)"
        fillOpacity={0.12}
        stroke="none"
        ifOverflow="visible"
      />
    ) : null
  return (
    <div className="flex flex-col gap-0.5">
      <ChartContainer
        config={config}
        className="aspect-auto h-14 w-full"
        initialDimension={{ width: 240, height: 56 }}
      >
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ top: 6, right: 6, bottom: 4, left: 0 }}
        >
          <YAxis
            domain={domain}
            ticks={min === max ? [min] : [min, max]}
            tickFormatter={(v: number) => formatNumber(v, locale)}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={32}
            interval={0}
          />
          {band(primary, "primary")}
          {band(secondary, "secondary")}
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
            activeDot={{ r: 4 }}
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
              activeDot={{ r: 4 }}
            />
          ) : null}
        </LineChart>
      </ChartContainer>
      {first && last ? (
        <p className="pl-8 text-[11px] text-muted-foreground tabular-nums">
          {formatMonth(first.date, locale)} – {formatMonth(last.date, locale)}
        </p>
      ) : null}
    </div>
  )
}

type TrendCardProps = {
  trend: Trend
  /** Pin toggle (Messwerte tab); absent on the overview. */
  pin?: { pinned: boolean; onToggle: () => void }
}

function TrendCard({ trend, pin }: TrendCardProps) {
  const { locale, t } = useI18n()
  const latest = trend.points[trend.points.length - 1]
  if (!latest) return null
  const flag = latest.flag ? FLAG_META[latest.flag] : null
  const norm = formatNorm(trend, locale)
  return (
    <li>
      <Card size="sm" className="h-full">
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs text-muted-foreground">
              {trendTitle(trend, t)}
            </h4>
            <div className="flex items-center gap-1">
              {pin ? (
                <Button
                  size="xs"
                  variant={pin.pinned ? "secondary" : "ghost"}
                  aria-pressed={pin.pinned}
                  aria-label={t.trends.pinLabel(trendTitle(trend, t))}
                  onClick={pin.onToggle}
                >
                  <PinIcon data-icon="inline-start" />
                  {pin.pinned ? t.trends.pinned : t.trends.pin}
                </Button>
              ) : null}
              <TrendDetailDialog
                trend={trend}
                trigger={
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={t.trends.detailsLabel(trendTitle(trend, t))}
                  />
                }
              >
                {t.trends.details}
              </TrendDetailDialog>
            </div>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <p className="text-xl leading-tight font-semibold tabular-nums">
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
          <p className="sr-only">{summarize(trend, t, locale)}</p>
          <TrendChart trend={trend} />
          {norm ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t.trends.norm(norm)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </li>
  )
}

type PatientTrendsProps = {
  patientId: string
  /** overview: pinned charts only. all: every chart, with search and pins. */
  view: "overview" | "all"
}

export function PatientTrends({ patientId, view }: PatientTrendsProps) {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const { pins, toggle } = usePinnedCharts()
  const { data, loading, error, refetch } = useQuery(PATIENT_TRENDS_QUERY, {
    variables: { id: patientId },
  })
  const trends = data?.patient?.trends ?? []
  const pending = loading && !data
  const shown = pins ?? defaultPins(trends)

  if (error) {
    return (
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
    )
  }
  if (pending) return <PatientTrendsSkeleton />

  if (view === "overview") {
    const pinned = trends.filter((trend) => shown.includes(trend.code))
    if (pinned.length === 0) return null
    return (
      <section className="flex flex-col gap-2" aria-labelledby="pinned-heading">
        <h3 id="pinned-heading" className="text-sm font-medium">
          {t.trends.pinnedTitle}
        </h3>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pinned.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t.trends.pinnedHint}</p>
      </section>
    )
  }

  if (trends.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t.trends.none}
      </p>
    )
  }
  const query = search.trim().toLowerCase()
  const matches = query
    ? trends.filter((trend) =>
        // Shown name and recorded name ("Blutzucker" and "Glucose").
        `${trendTitle(trend, t)} ${trend.title}`.toLowerCase().includes(query)
      )
    : trends
  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t.trends.searchPlaceholder}
        aria-label={t.trends.searchLabel}
        className="sm:max-w-xs"
      />
      {matches.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t.trends.noMatch}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              pin={{
                pinned: shown.includes(trend.code),
                onToggle: () => toggle(trend.code, shown),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
