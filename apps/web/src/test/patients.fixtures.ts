import type { PatientSummary } from "@/graphql/patients"

/** GraphQL-shaped patients mirroring data/fhir (API sort order). */
export const PATIENTS: PatientSummary[] = [
  {
    __typename: "Patient",
    id: "pat-amelia-hartwell",
    displayName: "Amelia Rose Hartwell",
    gender: "FEMALE",
    birthDate: "1985-12-10",
    mrn: "MRN-100001",
    activeDiagnoses: ["Type 2 diabetes mellitus", "Essential hypertension"],
    abnormalResultCount: 2,
  },
  {
    __typename: "Patient",
    id: "pat-jonah-reyes",
    displayName: "Jonah Miguel Reyes",
    gender: "MALE",
    birthDate: "1958-04-22",
    mrn: "MRN-100002",
    activeDiagnoses: ["Chronic obstructive pulmonary disease"],
    abnormalResultCount: 1,
  },
  {
    __typename: "Patient",
    id: "pat-okafor-minimal",
    displayName: "Okafor",
    gender: null,
    birthDate: null,
    mrn: null,
    activeDiagnoses: [],
    abnormalResultCount: 0,
  },
  {
    __typename: "Patient",
    id: "pat-priya-natarajan",
    displayName: "Priya Natarajan",
    gender: "FEMALE",
    birthDate: "1992-08-30",
    mrn: "MRN-100003",
    activeDiagnoses: ["Asthma"],
    abnormalResultCount: 0,
  },
]
