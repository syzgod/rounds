import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

/** Mirrors `enum Gender` in apps/api/src/schema.gql. */
export type Gender = "FEMALE" | "MALE" | "OTHER" | "UNKNOWN"

/** Mirrors `type Patient` in apps/api/src/schema.gql (no rawJson: Inspector only). */
export type PatientSummary = {
  __typename: "Patient"
  id: string
  displayName: string
  gender: Gender | null
  birthDate: string | null
  mrn: string | null
  /** Labels of active conditions, newest first. */
  activeDiagnoses: string[]
  /** Distinct measurements whose latest value is flagged. */
  abnormalResultCount: number
}

export const PATIENT_SUMMARY_FIELDS = gql`
  fragment PatientSummaryFields on Patient {
    id
    displayName
    gender
    birthDate
    mrn
    activeDiagnoses
    abnormalResultCount
  }
`

export const PATIENTS_QUERY: TypedDocumentNode<
  { patients: PatientSummary[] },
  Record<string, never>
> = gql`
  query Patients {
    patients {
      ...PatientSummaryFields
    }
  }
  ${PATIENT_SUMMARY_FIELDS}
`

export const PATIENT_QUERY: TypedDocumentNode<
  { patient: PatientSummary | null },
  { id: string }
> = gql`
  query Patient($id: ID!) {
    patient(id: $id) {
      ...PatientSummaryFields
    }
  }
  ${PATIENT_SUMMARY_FIELDS}
`
