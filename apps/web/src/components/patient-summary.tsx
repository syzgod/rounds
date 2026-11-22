import { lazy, Suspense } from "react"
import { useQuery } from "@apollo/client/react"
import { AlertCircleIcon, RotateCwIcon, UserXIcon } from "lucide-react"

import { LoadingNote } from "@/components/loading-note"
import { OpenResults } from "@/components/open-results"
import { SourceDialog } from "@/components/source-dialog"
import { PatientTimeline } from "@/components/patient-timeline"
import { ErrorBoundary, ErrorFallback } from "@/components/error-boundary"
import { PatientTrendsSkeleton } from "@/components/patient-trends-skeleton"

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PATIENT_QUERY, type PatientSummary } from "@/graphql/patients"
import { PATIENT_TIMELINE_QUERY } from "@/graphql/timeline"
import { PATIENT_TRENDS_QUERY } from "@/graphql/trends"
import { useI18n } from "@/i18n/locale-provider"
import {
  ageInYears,
  formatFhirDate,
  formatGender,
  initials,
} from "@/lib/format"

// Recharts is heavy: load the trends section (and the library) in its own chunk.
const PatientTrends = lazy(() =>
  import("@/components/patient-trends").then((m) => ({
    default: m.PatientTrends,
  }))
)

/** Charts in their own chunk, behind an error boundary (a failed chunk must not blank the page). */
function Trends({
  patientId,
  view,
}: {
  patientId: string
  view: "overview" | "all"
}) {
  const { t } = useI18n()
  return (
    <ErrorBoundary fallback={<ErrorFallback message={t.trends.loadError} />}>
      <Suspense fallback={<PatientTrendsSkeleton />}>
        <PatientTrends patientId={patientId} view={view} />
      </Suspense>
    </ErrorBoundary>
  )
}

/** Übersicht (open results, pinned charts), Verlauf (timeline), Messwerte (all charts). */
// Same look as the outline toggle: primary border and tint when selected.
const TAB_CLASS =
  "border-input bg-transparent data-active:border-primary data-active:bg-primary/10 data-active:shadow-none dark:data-active:border-primary dark:data-active:bg-primary/10";

function RecordTabs({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const timeline = useQuery(PATIENT_TIMELINE_QUERY, {
    variables: { id: patientId },
  })
  const trends = useQuery(PATIENT_TRENDS_QUERY, {
    variables: { id: patientId },
  })
  const count = (n: number | undefined) =>
    n === undefined ? null : (
      <span className="text-muted-foreground tabular-nums">{n}</span>
    )
  return (
    <Tabs defaultValue="overview" className="gap-4">
      <TabsList aria-label={t.record.tabsLabel} className="gap-2 bg-transparent p-0">
        <TabsTrigger value="overview" className={TAB_CLASS}>{t.record.overview}</TabsTrigger>
        <TabsTrigger value="timeline" className={TAB_CLASS}>
          {t.timeline.title} {count(timeline.data?.patient?.timeline.length)}
        </TabsTrigger>
        <TabsTrigger value="measurements" className={TAB_CLASS}>
          {t.record.measurements} {count(trends.data?.patient?.trends.length)}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="flex flex-col gap-6">
        <OpenResults patientId={patientId} />
        <Trends patientId={patientId} view="overview" />
      </TabsContent>
      <TabsContent value="timeline">
        <PatientTimeline patientId={patientId} />
      </TabsContent>
      <TabsContent value="measurements">
        <Trends patientId={patientId} view="all" />
      </TabsContent>
    </Tabs>
  )
}

type PatientSummaryPanelProps = {
  patientId: string
  onClearSelection: () => void
}

function Fact({ label, value }: { label: string; value: string | null }) {
  const { t } = useI18n()
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">
        {value ?? (
          <span className="font-normal text-muted-foreground">
            {t.common.notRecorded}
          </span>
        )}
      </dd>
    </div>
  )
}

function PatientHeader({ patient }: { patient: PatientSummary }) {
  const { locale, t } = useI18n()
  const age = ageInYears(patient.birthDate)
  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback>{initials(patient.displayName)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <h2
            id="patient-heading"
            className="truncate text-xl font-semibold tracking-tight"
          >
            {patient.displayName}
          </h2>
        </div>
        <SourceDialog
          target={{ kind: "patient", id: patient.id }}
          name={patient.displayName}
          label={t.source.open}
          variant="outline"
          size="sm"
          className="ml-auto shrink-0"
        />
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact label={t.patient.sex} value={formatGender(patient.gender, t)} />
        <Fact
          label={t.patient.age}
          value={age === null ? null : t.common.ageYears(age)}
        />
        <Fact
          label={t.patient.birthDate}
          value={formatFhirDate(patient.birthDate, locale)}
        />
        <Fact label={t.patient.mrn} value={patient.mrn} />
      </dl>
      <div className="flex flex-col gap-1">
        <h3 className="text-xs text-muted-foreground">
          {t.triage.activeDiagnoses}
        </h3>
        <p className="text-sm font-medium">
          {patient.activeDiagnoses.length > 0 ? (
            patient.activeDiagnoses.join(", ")
          ) : (
            <span className="font-normal text-muted-foreground">
              {t.triage.none}
            </span>
          )}
        </p>
      </div>
    </header>
  )
}

function PatientHeaderSkeleton() {
  const { t } = useI18n()
  return (
    <div
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label={t.patient.loading}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3.5 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PatientSummaryPanel({
  patientId,
  onClearSelection,
}: PatientSummaryPanelProps) {
  const { t } = useI18n()
  const { data, loading, error, refetch } = useQuery(PATIENT_QUERY, {
    variables: { id: patientId },
  })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>{t.patient.loadError}</AlertTitle>
        <AlertAction>
          <Button size="xs" variant="outline" onClick={() => void refetch()}>
            <RotateCwIcon data-icon="inline-start" />
            {t.common.retry}
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <LoadingNote
          text={patientId.startsWith("live-") ? t.patient.loadingLive : null}
        />
        <PatientHeaderSkeleton />
      </div>
    )
  }

  const patient = data?.patient
  if (!patient) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserXIcon />
          </EmptyMedia>
          <EmptyTitle>{t.patient.notFound}</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearSelection}>
            {t.patient.backToList}
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PatientHeader patient={patient} />
      <Separator />
      <RecordTabs patientId={patient.id} />
    </div>
  )
}
