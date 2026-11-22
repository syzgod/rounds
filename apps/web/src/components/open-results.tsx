import { useQuery } from "@apollo/client/react"

import { TimelineItem } from "@/components/patient-timeline"
import { Skeleton } from "@/components/ui/skeleton"
import { PATIENT_TIMELINE_QUERY } from "@/graphql/timeline"
import { useI18n } from "@/i18n/locale-provider"

/**
 * The patient's open results (latest flagged reading per measurement, not yet
 * acknowledged): what needs attention first. Shares the timeline query and
 * cache; errors show in the Verlauf tab, so this stays quiet on failure.
 */
export function OpenResults({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const { data, loading } = useQuery(PATIENT_TIMELINE_QUERY, {
    variables: { id: patientId },
  })
  const open = (data?.patient?.timeline ?? []).filter(
    (event) => event.needsAcknowledgement
  )

  return (
    <section className="flex flex-col gap-2" aria-labelledby="open-heading">
      <h3 id="open-heading" className="text-sm font-medium">
        {t.record.openResults}
      </h3>
      {loading && !data ? (
        <Skeleton className="h-12 w-full" />
      ) : open.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.record.noOpenResults}
        </p>
      ) : (
        <ol className="flex flex-col">
          {open.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </ol>
      )}
    </section>
  )
}
