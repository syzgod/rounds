import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@apollo/client/react"
import { AlertCircleIcon, RotateCwIcon } from "lucide-react"

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { PATIENTS_QUERY, type PatientSummary } from "@/graphql/patients"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useI18n } from "@/i18n/locale-provider"
import type { Messages } from "@/i18n/messages"
import { ageInYears, formatGenderShort, initials } from "@/lib/format"

type PatientDirectoryProps = {
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Case-insensitive match on display name or MRN; keeps the API's sort order. */
export function filterPatients(
  patients: readonly PatientSummary[],
  search: string
): PatientSummary[] {
  const query = search.trim().toLowerCase()
  if (!query) return [...patients]
  return patients.filter(
    (patient) =>
      patient.displayName.toLowerCase().includes(query) ||
      (patient.mrn?.toLowerCase().includes(query) ?? false)
  )
}

function patientMeta(patient: PatientSummary, t: Messages): string {
  const age = ageInYears(patient.birthDate)
  const parts = [
    formatGenderShort(patient.gender, t),
    age === null ? null : t.common.ageShort(age),
    patient.mrn,
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(" · ") : t.directory.noDetails
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  )
}

/** Press "/" anywhere (outside a text field) to jump to the search box. */
function useSlashToFocus(target: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      target.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [target])
}

export function PatientDirectory({
  selectedId,
  onSelect,
}: PatientDirectoryProps) {
  const { t } = useI18n()
  const { data, loading, error, refetch } = useQuery(PATIENTS_QUERY)
  const [search, setSearch] = useState("")
  // cmdk's highlighted row; follows the selection (e.g. on Back/Forward).
  const [highlighted, setHighlighted] = useState(selectedId ?? "")
  const [syncedSelection, setSyncedSelection] = useState(selectedId)
  if (selectedId !== syncedSelection) {
    // Adjust state during render when the prop changes (no effect needed).
    setSyncedSelection(selectedId)
    if (selectedId) setHighlighted(selectedId)
  }
  const inputRef = useRef<HTMLInputElement>(null)
  useSlashToFocus(inputRef)

  const patients = useMemo(() => data?.patients ?? [], [data])
  const visible = useMemo(
    () => filterPatients(patients, search),
    [patients, search]
  )
  const resultCount =
    visible.length === patients.length
      ? t.directory.count(patients.length)
      : t.directory.countFiltered(visible.length, patients.length)
  const announcedCount = useDebouncedValue(resultCount, 500)

  return (
    <nav
      aria-label={t.directory.navLabel}
      className="flex min-h-0 flex-col gap-2 p-3"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium">{t.directory.title}</h2>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {t.directory.searchKey} <Kbd>/</Kbd>
        </span>
      </div>

      <Command
        // cmdk names its input via aria-labelledby -> this (visually hidden) label.
        label={t.directory.searchLabel}
        shouldFilter={false}
        value={highlighted}
        onValueChange={setHighlighted}
        className="min-h-0 flex-1 bg-transparent p-0"
      >
        <CommandInput
          ref={inputRef}
          value={search}
          onValueChange={setSearch}
          placeholder={t.directory.searchPlaceholder}
          disabled={loading && !data}
        />

        {error ? (
          <Alert variant="destructive" className="mt-2">
            <AlertCircleIcon />
            <AlertTitle>{t.directory.loadError}</AlertTitle>
            <AlertAction>
              <Button
                size="xs"
                variant="outline"
                onClick={() => void refetch()}
              >
                <RotateCwIcon data-icon="inline-start" />
                {t.common.retry}
              </Button>
            </AlertAction>
          </Alert>
        ) : loading && !data ? (
          <div
            className="flex flex-col gap-1 p-1"
            aria-busy="true"
            aria-label={t.directory.loading}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CommandList label={t.directory.title} className="max-h-none flex-1">
            <CommandEmpty>{t.directory.noMatch(search.trim())}</CommandEmpty>
            <CommandGroup>
              {visible.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.id}
                  onSelect={() => onSelect(patient.id)}
                  data-checked={patient.id === selectedId}
                  // Teal accent bar marks the open patient (distinct from the keyboard highlight).
                  className="gap-3 py-2 data-[checked=true]:before:absolute data-[checked=true]:before:inset-y-2 data-[checked=true]:before:left-0 data-[checked=true]:before:w-0.5 data-[checked=true]:before:rounded-full data-[checked=true]:before:bg-primary"
                >
                  <Avatar>
                    <AvatarFallback>
                      {initials(patient.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {patient.displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {patientMeta(patient, t)}
                    </span>
                  </span>
                  {patient.abnormalResultCount > 0 ? (
                    <Badge variant="warning" className="ml-auto">
                      <span aria-hidden="true">
                        {t.triage.abnormalShort(patient.abnormalResultCount)}
                      </span>
                      <span className="sr-only">
                        {t.triage.abnormalLabel(patient.abnormalResultCount)}
                      </span>
                    </Badge>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>

      {data ? (
        <p className="px-1 text-xs text-muted-foreground" aria-hidden="true">
          {resultCount}
        </p>
      ) : null}
      {/* Always mounted; announces the count once typing pauses, not per keystroke. */}
      <p className="sr-only" role="status" aria-live="polite">
        {data ? announcedCount : ""}
      </p>
    </nav>
  )
}
