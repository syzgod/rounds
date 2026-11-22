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

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
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
  { label: string; plural: string; icon: LucideIcon; tone: string }
> = {
  ENCOUNTER: {
    label: "Encounter",
    plural: "Encounters",
    icon: StethoscopeIcon,
    tone: "bg-encounter/12 text-encounter",
  },
  CONDITION: {
    label: "Condition",
    plural: "Conditions",
    icon: ClipboardListIcon,
    tone: "bg-condition/12 text-condition",
  },
  OBSERVATION: {
    label: "Observation",
    plural: "Observations",
    icon: FlaskConicalIcon,
    tone: "bg-observation/12 text-observation",
  },
}

const FLAG_META: Record<
  ObservationFlag,
  { label: string; icon: LucideIcon; variant: "warning" | "destructive" }
> = {
  LOW: { label: "Low", icon: ArrowDownIcon, variant: "warning" },
  HIGH: { label: "High", icon: ArrowUpIcon, variant: "destructive" },
  ABNORMAL: { label: "Abnormal", icon: TriangleAlertIcon, variant: "warning" },
}

/** Statuses worth showing: the "normal" final/finished states are omitted as noise. */
const HIDDEN_STATUSES = new Set(["final", "finished", "amended", "corrected"])

type DayGroup = { key: string; label: string; events: TimelineEvent[] }

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
        label: key === "undated" ? "Undated" : (formatFhirDate(key) ?? key),
        events: [event],
      })
    }
  }
  return groups
}

function sentence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const meta = KIND_META[event.kind]
  const Icon = meta.icon
  const flag = event.flag ? FLAG_META[event.flag] : null
  const showStatus = event.status !== null && !HIDDEN_STATUSES.has(event.status)
  const when =
    event.kind === "CONDITION"
      ? event.endDate
        ? `until ${formatFhirDate(dayKey(event.endDate)) ?? event.endDate}`
        : null
      : formatTimeRange(event.date, event.endDate)
  const details = [meta.label, event.category, when].filter(
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
          {flag ? (
            <Badge variant={flag.variant}>
              <flag.icon data-icon="inline-start" />
              {flag.label}
            </Badge>
          ) : null}
          {showStatus && event.status ? (
            <Badge
              variant={event.status === "active" ? "outline" : "secondary"}
            >
              {sentence(event.status)}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>
      </div>
    </li>
  )
}

function TimelineSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading timeline"
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
        <AlertTitle>Couldn’t load the timeline</AlertTitle>
        <AlertDescription>Check that the API is running.</AlertDescription>
        <AlertAction>
          <Button size="xs" variant="outline" onClick={() => void refetch()}>
            <RotateCwIcon data-icon="inline-start" />
            Retry
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
          <EmptyTitle>No clinical events recorded</EmptyTitle>
          <EmptyDescription>
            This patient has no encounters, conditions or observations in the
            fixtures.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          aria-label="Filter timeline by type"
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
            All{" "}
            <span className="text-muted-foreground tabular-nums">
              {events.length}
            </span>
          </ToggleGroupItem>
          {KINDS.map((kind) => (
            <ToggleGroupItem key={kind} value={kind}>
              {KIND_META[kind].plural}{" "}
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
            ? `${events.length} events`
            : `${visible.length} of ${events.length} events`}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No{" "}
          {filter === "ALL" ? "events" : KIND_META[filter].plural.toLowerCase()}{" "}
          for this patient.
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
                {group.label}
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
