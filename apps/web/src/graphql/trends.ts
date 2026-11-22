import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

import type {
  PatientTrendsQuery,
  PatientTrendsQueryVariables,
} from "@/graphql/__generated__/graphql"

/** One measurement series; points oldest to newest, at least two. */
export type Trend = NonNullable<PatientTrendsQuery["patient"]>["trends"][number]
/** One reading; `secondaryValue` is the diastolic pressure for 85354-9. */
export type TrendPoint = Trend["points"][number]

export const PATIENT_TRENDS_QUERY: TypedDocumentNode<
  PatientTrendsQuery,
  PatientTrendsQueryVariables
> = gql`
  query PatientTrends($id: ID!) {
    patient(id: $id) {
      id
      trends {
        id
        code
        title
        unit
        referenceLow
        referenceHigh
        secondaryReferenceLow
        secondaryReferenceHigh
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
