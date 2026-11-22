import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

import type {
  PatientSourceQuery,
  PatientSourceQueryVariables,
  TimelineEventSourceQuery,
  TimelineEventSourceQueryVariables,
} from "@/graphql/__generated__/graphql"

/** Fetched only when the FHIR source dialog opens; no other query selects rawJson. */
export const PATIENT_SOURCE_QUERY: TypedDocumentNode<
  PatientSourceQuery,
  PatientSourceQueryVariables
> = gql`
  query PatientSource($id: ID!) {
    patient(id: $id) {
      id
      rawJson
    }
  }
`

export const TIMELINE_EVENT_SOURCE_QUERY: TypedDocumentNode<
  TimelineEventSourceQuery,
  TimelineEventSourceQueryVariables
> = gql`
  query TimelineEventSource($id: ID!) {
    timelineEvent(id: $id) {
      id
      rawJson
    }
  }
`
