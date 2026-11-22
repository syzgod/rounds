import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

/** Fetched only when the FHIR source dialog opens; no other query selects rawJson. */
export const PATIENT_SOURCE_QUERY: TypedDocumentNode<
  { patient: { __typename: "Patient"; id: string; rawJson: string } | null },
  { id: string }
> = gql`
  query PatientSource($id: ID!) {
    patient(id: $id) {
      id
      rawJson
    }
  }
`

export const TIMELINE_EVENT_SOURCE_QUERY: TypedDocumentNode<
  {
    timelineEvent: {
      __typename: "TimelineEvent"
      id: string
      rawJson: string
    } | null
  },
  { id: string }
> = gql`
  query TimelineEventSource($id: ID!) {
    timelineEvent(id: $id) {
      id
      rawJson
    }
  }
`
