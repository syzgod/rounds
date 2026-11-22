import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/i18n/locale-provider"

/** Two placeholder cards; also the Suspense fallback while the chart chunk loads. */
export function PatientTrendsSkeleton() {
  const { t } = useI18n()
  return (
    <div
      className="grid gap-3 md:grid-cols-2"
      aria-busy="true"
      aria-label={t.trends.loading}
    >
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  )
}
