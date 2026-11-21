import type { ErrorLike, TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"
import { CombinedGraphQLErrors } from "@apollo/client/errors"
import { useQuery } from "@apollo/client/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

function describeError(error: ErrorLike): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message ?? "GraphQL error"
  }
  return "API unreachable"
}

export function HealthStatus() {
  const { data, loading, error, refetch } = useQuery(HEALTH_QUERY)

  // aria-live on a stable wrapper so screen readers announce state transitions.
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2">
      {loading ? (
        <Badge variant="secondary">Checking API…</Badge>
      ) : error ? (
        <>
          <Badge variant="destructive">{describeError(error)}</Badge>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </>
      ) : data?.health === "ok" ? (
        <Badge variant="default">API connected</Badge>
      ) : (
        <Badge variant="destructive">Unexpected health response</Badge>
      )}
    </div>
  )
}
