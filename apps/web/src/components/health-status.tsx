import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/locale-provider"

type HealthQuery = { health: string }
type HealthQueryVariables = Record<string, never>

export const HEALTH_QUERY: TypedDocumentNode<
  HealthQuery,
  HealthQueryVariables
> = gql`
  query Health {
    health
  }
`

export function HealthStatus() {
  const { t } = useI18n()
  const { data, loading, error, refetch } = useQuery(HEALTH_QUERY)
  const online = !error && data?.health === "ok"

  // aria-live on a stable wrapper so screen readers announce state transitions.
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2">
      {loading ? (
        <Badge variant="secondary">{t.health.connecting}</Badge>
      ) : online ? (
        <Badge variant="default">{t.health.online}</Badge>
      ) : (
        <>
          <Badge variant="destructive">{t.health.offline}</Badge>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t.common.retry}
          </Button>
        </>
      )}
    </div>
  )
}
