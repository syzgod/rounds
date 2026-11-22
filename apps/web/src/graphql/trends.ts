import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

import type { ObservationFlag } from "@/graphql/timeline"

/** Mirrors `type TrendPoint` in apps/api/src/schema.gql. */
export type TrendPoint = {
  __typename: "TrendPoint"
  id: string
  date: string
  value: number
  /** Diastolic pressure for blood pressure (85354-9); null for other series. */
  secondaryValue: number | null
  flag: ObservationFlag | null
}

/** Mirrors `type Trend` in apps/api/src/schema.gql (points oldest to newest, at least two). */
export type Trend = {
  __typename: "Trend"
  id: string
  /** LOINC code of the series. */
  code: string
  title: string
  unit: string | null
  points: TrendPoint[]
}

export const PATIENT_TRENDS_QUERY: TypedDocumentNode<
  {
    patient: {
      __typename: "Patient"
      id: string
      trends: Trend[]
    } | null
  },
  { id: string }
> = gql`
  query PatientTrends($id: ID!) {
    patient(id: $id) {
      id
      trends {
        id
        code
        title
        unit
        points {
          id
          date
          value
          secondaryValue
          flag
        }
      }
    }
  }
`
