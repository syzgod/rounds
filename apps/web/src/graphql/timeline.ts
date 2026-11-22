import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

import type {
  AcknowledgeResultMutation,
  AcknowledgeResultMutationVariables,
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
    acknowledgedAt
    acknowledgedBy
    needsAcknowledgement
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

/** Acknowledges a flagged result; the returned event updates the cached row. */
export const ACKNOWLEDGE_RESULT_MUTATION: TypedDocumentNode<
  AcknowledgeResultMutation,
  AcknowledgeResultMutationVariables
> = gql`
  mutation AcknowledgeResult($id: ID!, $initials: String!) {
    acknowledgeResult(id: $id, initials: $initials) {
      ...TimelineEventFields
    }
  }
  ${TIMELINE_EVENT_FIELDS}
`
