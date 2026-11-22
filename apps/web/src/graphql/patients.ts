import type { TypedDocumentNode } from "@apollo/client"
import { gql } from "@apollo/client"

import type {
  Gender,
  PatientQuery,
  PatientQueryVariables,
  PatientsQuery,
  PatientsQueryVariables,
  PatientSummaryFieldsFragment,
} from "@/graphql/__generated__/graphql"

export type { Gender }
/** A patient in the directory and the record header (no rawJson: Inspector only). */
export type PatientSummary = PatientSummaryFieldsFragment

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
  PatientsQuery,
  PatientsQueryVariables
> = gql`
  query Patients {
    patients {
      ...PatientSummaryFields
    }
  }
  ${PATIENT_SUMMARY_FIELDS}
`

export const PATIENT_QUERY: TypedDocumentNode<
  PatientQuery,
  PatientQueryVariables
> = gql`
  query Patient($id: ID!) {
    patient(id: $id) {
      ...PatientSummaryFields
    }
  }
  ${PATIENT_SUMMARY_FIELDS}
`
