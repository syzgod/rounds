import { useState, type ReactElement, type ReactNode } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  allValues,
  BLOOD_PRESSURE,
  FLAG_META,
  makeDot,
  niceTicks,
  TrendTooltip,
  formatBand,
  formatDay,
  formatReading,
  inBand,
  toDatum,
  trendBands,
  trendTitle,
  type Band,
} from "@/components/trend-shared"
import { Badge } from "@/components/ui/badge"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Trend } from "@/graphql/trends"
import { useI18n } from "@/i18n/locale-provider"
import type { Messages } from "@/i18n/messages"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

function LegendSwatch({ dashed }: { dashed: boolean }) {
  return (
    <svg width="24" height="8" aria-hidden="true">
      <line
        x1="0"
        y1="4"
        x2="24"
        y2="4"
        stroke="var(--observation)"
        strokeWidth="2"
        strokeDasharray={dashed ? "5 3" : undefined}
      />
    </svg>
  )
}

type DetailChartProps = {
  trend: Trend
  /** Point to mark on the chart (the hovered table row). */
  highlightId: string | null
}

function DetailChart({ trend, highlightId }: DetailChartProps) {
  const { locale, t } = useI18n()
  const data = trend.points.map(toDatum)
  const isPressure = trend.code === BLOOD_PRESSURE
  const { primary, secondary } = trendBands(trend)
  const bandEdges = [primary, secondary].flatMap((b) =>
    b ? [b.low, b.high].filter((v): v is number => v !== null) : []
  )
  const values = [...allValues(data), ...bandEdges]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  // Small pad so points do not sit on the axis edge, then round ticks.
  const pad = (hi - lo) * 0.05
  const ticks = niceTicks(lo - pad, hi + pad)
  const domain: [number, number] = [ticks[0] ?? lo, ticks.at(-1) ?? hi]
  const lastIndex = data.length - 1
  const highlighted = trend.points.find((p) => p.id === highlightId)
  const mark = highlighted ? toDatum(highlighted) : null
  const config: ChartConfig = {
    value: { label: t.trends.systolic, color: "var(--observation)" },
    secondary: { label: t.trends.diastolic, color: "var(--observation)" },
  }
  const bandLabel = (suffix: string) =>
    isPressure
      ? `${t.trends.normalRange} ${suffix.toLowerCase()}`
      : t.trends.normalRange
  const band = (b: Band | null, key: string, label: string) =>
    b ? (
      <ReferenceArea
        key={key}
        y1={b.low ?? domain[0]}
        y2={b.high ?? domain[1]}
        fill="var(--observation)"
        fillOpacity={0.12}
        stroke="none"
        ifOverflow="visible"
        label={{
          value: label,
          position: "insideTopLeft",
          fontSize: 11,
          fill: "var(--muted-foreground)",
        }}
      />
    ) : null
  return (
    <div className="flex flex-col gap-2">
      {isPressure ? (
        <ul className="flex gap-4 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <LegendSwatch dashed={false} />
            {t.trends.systolic}
          </li>
          <li className="flex items-center gap-1.5">
            <LegendSwatch dashed />
            {t.trends.diastolic}
          </li>
        </ul>
      ) : null}
      <ChartContainer
        config={config}
        className="aspect-auto h-[260px] w-full"
        initialDimension={{ width: 560, height: 260 }}
      >
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 16, bottom: 4, left: 4 }}
        >
          <CartesianGrid vertical={false} strokeOpacity={0.4} />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            padding={{ left: 12, right: 12 }}
            tickFormatter={(v: number) =>
              formatDay(new Date(v).toISOString(), locale)
            }
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            tickFormatter={(v: number) => formatNumber(v, locale)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            width={trend.unit ? 56 : 44}
            label={
              trend.unit
                ? {
                    value: trend.unit,
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                    style: { textAnchor: "middle" },
                  }
                : undefined
            }
          />
          {band(primary, "primary", bandLabel(t.trends.systolic))}
          {band(secondary, "secondary", bandLabel(t.trends.diastolic))}
          <ChartTooltip
            isAnimationActive={false}
            content={<TrendTooltip trend={trend} />}
          />
          {mark ? (
            <ReferenceLine
              x={mark.time}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
            />
          ) : null}
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={makeDot({ secondary: false, lastIndex, everyPoint: true })}
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
              dot={makeDot({ secondary: true, lastIndex, everyPoint: true })}
              activeDot={{ r: 5 }}
            />
          ) : null}
          {mark ? (
            <ReferenceDot
              x={mark.time}
              y={mark.value}
              r={7}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={2}
            />
          ) : null}
          {mark && mark.secondary !== null ? (
            <ReferenceDot
              x={mark.time}
              y={mark.secondary}
              r={7}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={2}
            />
          ) : null}
        </LineChart>
      </ChartContainer>
    </div>
  )
}

/** Flag text, "Normal" when inside a known range, "—" otherwise. */
function assessment(
  trend: Trend,
  point: Trend["points"][number],
  t: Messages
): ReactNode {
  if (point.flag) {
    const meta = FLAG_META[point.flag]
    return (
      <Badge variant={meta.variant}>
        <meta.icon data-icon="inline-start" />
        {t.timeline.flag[point.flag]}
      </Badge>
    )
  }
  const { primary, secondary } = trendBands(trend)
  if (!primary) return t.trends.noAssessment
  const inside =
    inBand(primary, point.value) &&
    (!secondary ||
      point.secondaryValue === null ||
      inBand(secondary, point.secondaryValue))
  return inside ? t.trends.inRange : t.trends.noAssessment
}

type DetailTableProps = {
  trend: Trend
  highlightId: string | null
  /** Hovering a row marks its point on the chart. */
  onHighlight: (id: string | null) => void
}

function DetailTable({ trend, highlightId, onHighlight }: DetailTableProps) {
  const { locale, t } = useI18n()
  const rows = [...trend.points].reverse()
  return (
    <div
      // Scrollable regions must be focusable so keyboard users can scroll them.
      tabIndex={0}
      role="region"
      aria-label={t.trends.tableLabel}
      className="max-h-56 overflow-auto rounded-md border"
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-1.5 font-normal">
              {t.trends.colDate}
            </th>
            <th scope="col" className="px-3 py-1.5 font-normal">
              {t.trends.colValue}
            </th>
            <th scope="col" className="px-3 py-1.5 font-normal">
              {t.trends.colAssessment}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((point) => (
            <tr
              key={point.id}
              className={cn("border-t", point.id === highlightId && "bg-muted")}
              onMouseEnter={() => onHighlight(point.id)}
              onMouseLeave={() => onHighlight(null)}
            >
              <td className="px-3 py-1.5 tabular-nums">
                {formatDay(point.date, locale)}
              </td>
              <td className="px-3 py-1.5 tabular-nums">
                {formatReading(trend, point, locale)}
              </td>
              <td className="px-3 py-1.5">{assessment(trend, point, t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type TrendDetailDialogProps = {
  trend: Trend
  /** The trigger element, rendered through Base UI's `render` prop. */
  trigger: ReactElement
  /** Visible text of the trigger. */
  children: ReactNode
}

export function TrendDetailDialog({
  trend,
  trigger,
  children,
}: TrendDetailDialogProps) {
  const { locale, t } = useI18n()
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const { primary, secondary } = trendBands(trend)
  const norm = primary ? formatBand(primary, locale) : null
  const second = secondary ? formatBand(secondary, locale) : null
  const unit = trend.unit ? ` ${trend.unit}` : ""
  return (
    <Dialog>
      <DialogTrigger render={trigger}>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl"
        showCloseButton
        closeLabel={t.common.close}
      >
        <DialogHeader>
          <DialogTitle>{trendTitle(trend, t)}</DialogTitle>
          <DialogDescription>
            {norm
              ? `${t.trends.normalRange}: ${second ? `${norm} / ${second}` : norm}${unit}`
              : t.trends.tableLabel}
          </DialogDescription>
        </DialogHeader>
        <DetailChart trend={trend} highlightId={highlightId} />
        <DetailTable
          trend={trend}
          highlightId={highlightId}
          onHighlight={setHighlightId}
        />
      </DialogContent>
    </Dialog>
  )
}
