import { useQuery } from "@apollo/client/react"
import {
  ActivityIcon,
  AlertCircleIcon,
  RotateCwIcon,
  UserXIcon,
} from "lucide-react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { PATIENT_QUERY, type PatientSummary } from "@/graphql/patients"
import {
  ageInYears,
  formatFhirDate,
  formatGender,
  initials,
} from "@/lib/format"

type PatientSummaryPanelProps = {
  patientId: string
  onClearSelection: () => void
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">
        {value ?? (
          <span className="font-normal text-muted-foreground">
            Not recorded
          </span>
        )}
      </dd>
    </div>
  )
}

function PatientHeader({ patient }: { patient: PatientSummary }) {
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
          <p className="text-sm text-muted-foreground">
            Patient · <span className="font-mono">{patient.id}</span>
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact label="Gender" value={formatGender(patient.gender)} />
        <Fact label="Age" value={age === null ? null : `${age} years`} />
        <Fact label="Date of birth" value={formatFhirDate(patient.birthDate)} />
        <Fact label="MRN" value={patient.mrn} />
      </dl>
    </header>
  )
}

function PatientHeaderSkeleton() {
  return (
    <div
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Loading patient"
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
  const { data, loading, error, refetch } = useQuery(PATIENT_QUERY, {
    variables: { id: patientId },
  })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Couldn’t load this patient</AlertTitle>
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

  if (loading && !data) return <PatientHeaderSkeleton />

  const patient = data?.patient
  if (!patient) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserXIcon />
          </EmptyMedia>
          <EmptyTitle>Patient not found</EmptyTitle>
          <EmptyDescription>
            No patient with id <span className="font-mono">{patientId}</span>{" "}
            exists in the fixtures.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearSelection}>
            Back to directory
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PatientHeader patient={patient} />
      <Separator />
      <section
        aria-labelledby="timeline-heading"
        className="flex flex-col gap-3"
      >
        <h3 id="timeline-heading" className="text-sm font-medium">
          Clinical timeline
        </h3>
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ActivityIcon />
            </EmptyMedia>
            <EmptyTitle>Timeline coming next</EmptyTitle>
            <EmptyDescription>
              Encounters, conditions and observations for this patient will
              appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    </div>
  )
}
