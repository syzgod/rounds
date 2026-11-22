import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

/** Mirrors `enum TimelineEventKind` in apps/api/src/schema.gql. */
export type TimelineEventKind = "ENCOUNTER" | "CONDITION" | "OBSERVATION"

/** Mirrors `enum ObservationFlag` in apps/api/src/schema.gql. */
export type ObservationFlag = "LOW" | "HIGH" | "ABNORMAL"

/** Mirrors `type TimelineEvent` in apps/api/src/schema.gql (no rawJson: Inspector only). */
export type TimelineEvent = {
  __typename: "TimelineEvent"
  id: string
  kind: TimelineEventKind
  date: string | null
  endDate: string | null
  title: string
  detail: string | null
  category: string | null
  /** LOINC code of an Observation; translates `title`. */
  code: string | null
  /** Code behind `category` (Encounter class or category code); translates it. */
  categoryCode: string | null
  status: string | null
  flag: ObservationFlag | null
}

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
  {
    patient: {
      __typename: "Patient"
      id: string
      timeline: TimelineEvent[]
    } | null
  },
  { id: string }
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
