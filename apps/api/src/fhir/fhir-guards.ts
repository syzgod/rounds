import type { Bundle, FhirResource, Patient } from 'fhir/r4.js';

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
