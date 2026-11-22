import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

import type {
  ObservationFlag,
  PatientTimelineQuery,
  PatientTimelineQueryVariables,
  TimelineEventFieldsFragment,
  TimelineEventKind,
} from "@/graphql/__generated__/graphql"

export type { ObservationFlag, TimelineEventKind }
/** One timeline row (no rawJson: Inspector only). */
export type TimelineEvent = TimelineEventFieldsFragment

export const TIMELINE_EVENT_FIELDS = gql`
  fragment TimelineEventFields on TimelineEvent {
    id
    kind
    date
    endDate
    title
    detail
    category
    code
    categoryCode
    status
    flag
  }
`

export const PATIENT_TIMELINE_QUERY: TypedDocumentNode<
  PatientTimelineQuery,
  PatientTimelineQueryVariables
> = gql`
  query PatientTimeline($id: ID!) {
    patient(id: $id) {
      id
      timeline {
        ...TimelineEventFields
      }
    }
  }
  ${TIMELINE_EVENT_FIELDS}
`
