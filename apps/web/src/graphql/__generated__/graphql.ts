/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** FHIR R4 administrative gender. */
export type Gender =
  | 'FEMALE'
  | 'MALE'
  | 'OTHER'
  | 'UNKNOWN';

/** Out-of-range result flag derived from Observation.interpretation. */
export type ObservationFlag =
  | 'ABNORMAL'
  | 'HIGH'
  | 'LOW';

/** The FHIR resource type behind a timeline event. */
export type TimelineEventKind =
  | 'CONDITION'
  | 'ENCOUNTER'
  | 'OBSERVATION';

export type HealthQueryVariables = Exact<{ [key: string]: never; }>;


export type HealthQuery = { health: string };

export type PatientSummaryFieldsFragment = { __typename: 'Patient', id: string, displayName: string, gender: Gender | null, birthDate: string | null, mrn: string | null, activeDiagnoses: Array<string>, abnormalResultCount: number };

export type PatientsQueryVariables = Exact<{ [key: string]: never; }>;


export type PatientsQuery = { patients: Array<{ __typename: 'Patient', id: string, displayName: string, gender: Gender | null, birthDate: string | null, mrn: string | null, activeDiagnoses: Array<string>, abnormalResultCount: number }> };

export type PatientQueryVariables = Exact<{
  id: string | number;
}>;


export type PatientQuery = { patient: { __typename: 'Patient', id: string, displayName: string, gender: Gender | null, birthDate: string | null, mrn: string | null, activeDiagnoses: Array<string>, abnormalResultCount: number } | null };

export type PatientSourceQueryVariables = Exact<{
  id: string | number;
}>;


export type PatientSourceQuery = { patient: { __typename: 'Patient', id: string, rawJson: string | null } | null };

export type TimelineEventSourceQueryVariables = Exact<{
  id: string | number;
}>;


export type TimelineEventSourceQuery = { timelineEvent: { __typename: 'TimelineEvent', id: string, rawJson: string | null } | null };

export type TimelineEventFieldsFragment = { __typename: 'TimelineEvent', id: string, kind: TimelineEventKind, date: string | null, endDate: string | null, title: string, detail: string | null, category: string | null, code: string | null, categoryCode: string | null, status: string | null, flag: ObservationFlag | null };

export type PatientTimelineQueryVariables = Exact<{
  id: string | number;
}>;


export type PatientTimelineQuery = { patient: { __typename: 'Patient', id: string, timeline: Array<{ __typename: 'TimelineEvent', id: string, kind: TimelineEventKind, date: string | null, endDate: string | null, title: string, detail: string | null, category: string | null, code: string | null, categoryCode: string | null, status: string | null, flag: ObservationFlag | null }> } | null };

export type PatientTrendsQueryVariables = Exact<{
  id: string | number;
}>;


export type PatientTrendsQuery = { patient: { __typename: 'Patient', id: string, trends: Array<{ __typename: 'Trend', id: string, code: string, title: string, unit: string | null, referenceLow: number | null, referenceHigh: number | null, secondaryReferenceLow: number | null, secondaryReferenceHigh: number | null, points: Array<{ __typename: 'TrendPoint', id: string, date: string, value: number, secondaryValue: number | null, flag: ObservationFlag | null }> }> } | null };
