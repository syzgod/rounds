import { lazy, Suspense } from "react"
import { useQuery } from "@apollo/client/react"
import { AlertCircleIcon, RotateCwIcon, UserXIcon } from "lucide-react"

import { SourceDialog } from "@/components/source-dialog"
import { PatientTimeline } from "@/components/patient-timeline"
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
import { PATIENT_QUERY, type PatientSummary } from "@/graphql/patients"
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

  if (loading && !data) return <PatientHeaderSkeleton />

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
      <Suspense fallback={<PatientTrendsSkeleton />}>
        <PatientTrends patientId={patient.id} />
      </Suspense>
      <section className="flex flex-col gap-3">
        <h3 id="timeline-heading" className="text-sm font-medium">
          {t.timeline.title}
        </h3>
        <PatientTimeline patientId={patient.id} />
      </section>
    </div>
  )
}
