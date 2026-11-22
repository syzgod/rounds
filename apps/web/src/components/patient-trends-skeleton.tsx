import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/i18n/locale-provider"

/** Placeholder cards; also the Suspense fallback while the chart chunk loads. */
export function PatientTrendsSkeleton() {
  const { t } = useI18n()
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label={t.trends.loading}
    >
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="hidden h-36 rounded-xl lg:block" />
    </div>
  )
}
