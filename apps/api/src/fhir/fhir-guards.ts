import type {
  Bundle,
  Condition,
  Encounter,
  FhirResource,
  Observation,
  Patient,
} from 'fhir/r4.js';

/** A FHIR resource whose optional `id` is known to be present. */
export type Identified<T extends FhirResource> = T & { id: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Structural check at the JSON boundary: a resource with a `resourceType` and an `id`. */
export function isIdentifiedResource(
  value: unknown,
): value is Identified<FhirResource> {
  return (
    isRecord(value) &&
    typeof value.resourceType === 'string' &&
    typeof value.id === 'string' &&
    value.id.length > 0
  );
}

export function isBundle(value: unknown): value is Bundle<FhirResource> {
  return (
    isRecord(value) &&
    value.resourceType === 'Bundle' &&
    (value.entry === undefined || Array.isArray(value.entry))
  );
}

export function isPatient(value: unknown): value is Patient {
  return isRecord(value) && value.resourceType === 'Patient';
}

export function isEncounter(value: unknown): value is Encounter {
  return isRecord(value) && value.resourceType === 'Encounter';
}

export function isCondition(value: unknown): value is Condition {
  return isRecord(value) && value.resourceType === 'Condition';
}

export function isObservation(value: unknown): value is Observation {
  return isRecord(value) && value.resourceType === 'Observation';
}

/** The resource types that make up the patient timeline. */
export type ClinicalResource = Identified<Encounter | Condition | Observation>;

export function isClinicalResource(
  value: Identified<FhirResource>,
): value is ClinicalResource {
  return isEncounter(value) || isCondition(value) || isObservation(value);
}
