import { useId, useState, type FormEvent } from "react"
import { useMutation } from "@apollo/client/react"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  ACKNOWLEDGE_RESULT_MUTATION,
  type TimelineEvent,
} from "@/graphql/timeline"
import { useI18n } from "@/i18n/locale-provider"
import { dayKey, formatFhirDate, formatTime } from "@/lib/format"
import { isValidInitials, readInitials, saveInitials } from "@/lib/initials"

type AcknowledgeResultProps = {
  /** A timeline event; only open or acknowledged results render anything. */
  event: TimelineEvent
  /** Translated title, for the button's accessible name. */
  title: string
}

/** "Acknowledge" for an open result; who and when once acknowledged; else nothing. */
export function AcknowledgeResult({ event, title }: AcknowledgeResultProps) {
  const { locale, t } = useI18n()
  const [askInitials, setAskInitials] = useState(false)
  const [acknowledge, { loading, error }] = useMutation(
    ACKNOWLEDGE_RESULT_MUTATION,
    // The open-result badges live on Patient; refresh them.
    { refetchQueries: ["Patients", "Patient"] }
  )

  if (event.acknowledgedAt && event.acknowledgedBy) {
    const when = [
      formatFhirDate(dayKey(event.acknowledgedAt), locale),
      formatTime(event.acknowledgedAt, locale),
    ]
      .filter(Boolean)
      .join(" ")
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <CheckIcon aria-hidden="true" className="size-3.5" />
        {t.acknowledge.done(event.acknowledgedBy, when)}
      </p>
    )
  }

  if (!event.needsAcknowledgement) return null

  const submit = (initials: string) => {
    // The error shows through `error`; nothing else to do with the rejection.
    acknowledge({ variables: { id: event.id, initials } }).catch(() => {})
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="xs"
        variant="outline"
        disabled={loading}
        aria-label={t.acknowledge.actionLabel(title)}
        onClick={() => {
          const saved = readInitials()
          if (saved) submit(saved)
          else setAskInitials(true)
        }}
      >
        <CheckIcon data-icon="inline-start" />
        {t.acknowledge.action}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {t.acknowledge.saveError}
        </span>
      ) : null}
      <InitialsDialog
        open={askInitials}
        onOpenChange={setAskInitials}
        onConfirm={(initials) => {
          saveInitials(initials)
          setAskInitials(false)
          submit(initials.trim())
        }}
      />
    </div>
  )
}

type InitialsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (initials: string) => void
}

/** Asks once for the initials that go into the audit log. */
function InitialsDialog({
  open,
  onOpenChange,
  onConfirm,
}: InitialsDialogProps) {
  const { t } = useI18n()
  const id = useId()
  const [value, setValue] = useState("")
  const [invalid, setInvalid] = useState(false)

  const onSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    if (isValidInitials(value)) onConfirm(value)
    else setInvalid(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        showCloseButton
        closeLabel={t.common.close}
      >
        <DialogHeader>
          <DialogTitle>{t.acknowledge.initialsTitle}</DialogTitle>
          <DialogDescription>{t.acknowledge.initialsHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
          <label htmlFor={id} className="text-sm font-medium">
            {t.acknowledge.initialsLabel}
          </label>
          <Input
            id={id}
            value={value}
            maxLength={8}
            autoComplete="off"
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
            onChange={(changeEvent) => {
              setValue(changeEvent.target.value)
              setInvalid(false)
            }}
          />
          {invalid ? (
            <p id={`${id}-error`} className="text-xs text-destructive">
              {t.acknowledge.initialsInvalid}
            </p>
          ) : null}
          <Button type="submit" className="mt-1 self-end">
            {t.acknowledge.confirm}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
