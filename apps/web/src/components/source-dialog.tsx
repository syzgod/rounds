import { useEffect, useRef, useState } from "react"
import { useQuery } from "@apollo/client/react"
import {
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  RotateCwIcon,
} from "lucide-react"

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PATIENT_SOURCE_QUERY,
  TIMELINE_EVENT_SOURCE_QUERY,
} from "@/graphql/source"
import { useI18n } from "@/i18n/locale-provider"

export type SourceTarget =
  | { kind: "patient"; id: string }
  | { kind: "timelineEvent"; id: string }

type SourceDialogProps = {
  target: SourceTarget
  /** Display name shown with the resource type in the dialog description. */
  name: string
  /** Visible text of the trigger button. */
  label: string
  /** Accessible name when it must say more than the visible text. */
  ariaLabel?: string
  variant: "outline" | "ghost"
  size: "sm" | "xs"
  className?: string
}

/** Display only: the client never reads fields out of the resource. */
export function formatRawJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

/** "Observation/obs-1" -> "Observation"; patients are always "Patient". */
function resourceType(target: SourceTarget): string {
  return target.kind === "patient" ? "Patient" : target.id.split("/")[0]
}

function useRawJson(target: SourceTarget) {
  const patient = useQuery(PATIENT_SOURCE_QUERY, {
    variables: { id: target.id },
    skip: target.kind !== "patient",
  })
  const event = useQuery(TIMELINE_EVENT_SOURCE_QUERY, {
    variables: { id: target.id },
    skip: target.kind !== "timelineEvent",
  })
  return target.kind === "patient"
    ? {
        raw: patient.data?.patient?.rawJson ?? null,
        loading: patient.loading,
        error: patient.error,
        refetch: () => void patient.refetch(),
        hasData: patient.data !== undefined,
      }
    : {
        raw: event.data?.timelineEvent?.rawJson ?? null,
        loading: event.loading,
        error: event.error,
        refetch: () => void event.refetch(),
        hasData: event.data !== undefined,
      }
}

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => void copy()}>
        {copied ? (
          <CheckIcon data-icon="inline-start" />
        ) : (
          <CopyIcon data-icon="inline-start" />
        )}
        {t.source.copy}
      </Button>
      <span className="text-xs text-muted-foreground" role="status">
        {copied ? t.source.copied : ""}
      </span>
    </>
  )
}

function SourceBody({ target }: { target: SourceTarget }) {
  const { t } = useI18n()
  const { raw, loading, error, refetch, hasData } = useRawJson(target)

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>{t.source.loadError}</AlertTitle>
        <AlertAction>
          <Button size="xs" variant="outline" onClick={refetch}>
            <RotateCwIcon data-icon="inline-start" />
            {t.common.retry}
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (loading && !hasData) {
    return (
      <div
        className="flex flex-col gap-2"
        aria-busy="true"
        aria-label={t.source.loading}
      >
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    )
  }

  if (raw === null) {
    return <p className="text-sm text-muted-foreground">{t.source.notFound}</p>
  }

  const formatted = formatRawJson(raw)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CopyButton text={formatted} />
      </div>
      <pre
        // Scrollable regions must be focusable so keyboard users can scroll them.
        tabIndex={0}
        aria-label={t.source.title}
        className="max-h-[60vh] overflow-auto rounded-md border bg-muted/50 p-3 font-mono text-xs leading-relaxed"
      >
        <code>{formatted}</code>
      </pre>
    </div>
  )
}

export function SourceDialog({
  target,
  name,
  label,
  ariaLabel,
  variant,
  size,
  className,
}: SourceDialogProps) {
  const { t } = useI18n()
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant={variant}
            size={size}
            className={className}
            aria-label={ariaLabel}
          />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t.source.title}</DialogTitle>
          <DialogDescription>
            {resourceType(target)} · {name}
          </DialogDescription>
        </DialogHeader>
        <SourceBody target={target} />
      </DialogContent>
    </Dialog>
  )
}
