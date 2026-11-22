import { useMemo, useState } from "react"
import { useQuery } from "@apollo/client/react"
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ClipboardListIcon,
  FlaskConicalIcon,
  RotateCwIcon,
  StethoscopeIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  PATIENT_TIMELINE_QUERY,
  type ObservationFlag,
  type TimelineEvent,
  type TimelineEventKind,
} from "@/graphql/timeline"
import { useI18n } from "@/i18n/locale-provider"
import { isKnownStatus, type Locale, type Messages } from "@/i18n/messages"
import { dayKey, formatFhirDate, formatTimeRange } from "@/lib/format"
import { cn } from "@/lib/utils"

type KindFilter = "ALL" | TimelineEventKind

const KINDS: readonly TimelineEventKind[] = [
  "ENCOUNTER",
  "CONDITION",
  "OBSERVATION",
]

function isKindFilter(value: unknown): value is KindFilter {
  return value === "ALL" || KINDS.some((kind) => kind === value)
}

const KIND_META: Record<
  TimelineEventKind,
  { icon: LucideIcon; tone: string }
> = {
  ENCOUNTER: {
    icon: StethoscopeIcon,
    tone: "bg-encounter/12 text-encounter",
  },
  CONDITION: {
    icon: ClipboardListIcon,
    tone: "bg-condition/12 text-condition",
  },
  OBSERVATION: {
    icon: FlaskConicalIcon,
    tone: "bg-observation/12 text-observation",
  },
}

const FLAG_META: Record<
  ObservationFlag,
  { icon: LucideIcon; variant: "warning" | "destructive" }
> = {
  LOW: { icon: ArrowDownIcon, variant: "warning" },
  HIGH: { icon: ArrowUpIcon, variant: "destructive" },
  ABNORMAL: { icon: TriangleAlertIcon, variant: "warning" },
}

/** Statuses worth showing: the "normal" final/finished states are omitted as noise. */
const HIDDEN_STATUSES = new Set(["final", "finished", "amended", "corrected"])

type DayGroup = { key: string; events: TimelineEvent[] }

/** Groups already-sorted events into consecutive calendar days; undated events last. */
export function groupByDay(events: readonly TimelineEvent[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const event of events) {
    const key = dayKey(event.date) ?? "undated"
    const last = groups[groups.length - 1]
    if (last?.key === key) {
      last.events.push(event)
    } else {
      groups.push({
        key,
        events: [event],
      })
    }
  }
  return groups
}

function sentence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Translated FHIR status; unknown codes fall back to the sentence-cased code. */
function statusLabel(code: string, t: Messages): string {
  return isKnownStatus(code) ? t.timeline.status[code] : sentence(code)
}

function dayLabel(key: string, locale: Locale, t: Messages): string {
  if (key === "undated") return t.common.undated
  return formatFhirDate(key, locale) ?? key
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const { locale, t } = useI18n()
  const meta = KIND_META[event.kind]
  const Icon = meta.icon
  const flag = event.flag ? FLAG_META[event.flag] : null
  const showStatus = event.status !== null && !HIDDEN_STATUSES.has(event.status)
  const when =
    event.kind === "CONDITION"
      ? event.endDate
        ? t.common.until(
            formatFhirDate(dayKey(event.endDate), locale) ?? event.endDate
          )
        : null
      : formatTimeRange(event.date, event.endDate, locale, t)
  const details = [event.category, when].filter(
    (part): part is string => part !== null && part !== ""
  )

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
          meta.tone
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium">{event.title}</p>
          {event.detail ? (
            <span className="text-sm tabular-nums">{event.detail}</span>
          ) : null}
          {flag && event.flag ? (
            <Badge variant={flag.variant}>
              <flag.icon data-icon="inline-start" />
              {t.timeline.flag[event.flag]}
            </Badge>
          ) : null}
          {showStatus && event.status ? (
            <Badge
              variant={event.status === "active" ? "outline" : "secondary"}
            >
              {statusLabel(event.status, t)}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {/* The icon is aria-hidden, so screen readers get the kind here. */}
          <span className="sr-only">{t.timeline.kind[event.kind]}: </span>
          {details.join(" · ")}
        </p>
      </div>
    </li>
  )
}

function TimelineSkeleton() {
  const { t } = useI18n()
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label={t.timeline.loading}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PatientTimeline({ patientId }: { patientId: string }) {
  const { locale, t } = useI18n()
  const { data, loading, error, refetch } = useQuery(PATIENT_TIMELINE_QUERY, {
    variables: { id: patientId },
  })
  const [filter, setFilter] = useState<KindFilter>("ALL")

  const events = useMemo(() => data?.patient?.timeline ?? [], [data])
  const counts = useMemo(() => {
    const result: Record<TimelineEventKind, number> = {
      ENCOUNTER: 0,
      CONDITION: 0,
      OBSERVATION: 0,
    }
    for (const event of events) result[event.kind] += 1
    return result
  }, [events])
  const visible = useMemo(
    () =>
      filter === "ALL"
        ? events
        : events.filter((event) => event.kind === filter),
    [events, filter]
  )
  const groups = useMemo(() => groupByDay(visible), [visible])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>{t.timeline.loadError}</AlertTitle>
        <AlertAction>
          <Button size="xs" variant="outline" onClick={() => void refetch()}>
            <RotateCwIcon data-icon="inline-start" />
            {t.common.retry}
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (loading && !data) return <TimelineSkeleton />

  if (events.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardListIcon />
          </EmptyMedia>
          <EmptyTitle>{t.timeline.empty}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          aria-label={t.timeline.filterLabel}
          variant="outline"
          size="sm"
          value={[filter]}
          onValueChange={(value) => {
            // Single-select: ignore attempts to un-press the active filter.
            const next = value[0]
            if (isKindFilter(next)) setFilter(next)
          }}
        >
          <ToggleGroupItem value="ALL">
            {t.timeline.filterAll}{" "}
            <span className="text-muted-foreground tabular-nums">
              {events.length}
            </span>
          </ToggleGroupItem>
          {KINDS.map((kind) => (
            <ToggleGroupItem key={kind} value={kind}>
              {t.timeline.kindPlural[kind]}{" "}
              <span className="text-muted-foreground tabular-nums">
                {counts[kind]}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p
          className="text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {visible.length === events.length
            ? t.timeline.entryCount(events.length)
            : t.timeline.entryCountFiltered(visible.length, events.length)}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {filter === "ALL" ? t.timeline.empty : t.timeline.noneOfKind[filter]}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            // A plain wrapper, not a labelled <section>: one region landmark per
            // day would flood landmark navigation. The heading names the list.
            <div key={group.key} className="flex flex-col gap-2">
              <h4
                id={`day-${group.key}`}
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                {dayLabel(group.key, locale, t)}
              </h4>
              <ol
                aria-labelledby={`day-${group.key}`}
                className="relative flex flex-col before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-px before:bg-border"
              >
                {group.events.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
