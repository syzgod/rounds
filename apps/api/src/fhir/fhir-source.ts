import type { FhirResource, Patient, Reference } from 'fhir/r4.js';
import type { ClinicalResource, Identified } from './fhir-guards.js';

/** Read access to one FHIR data source. Ids are the source's own ids. */
export interface FhirSource {
  getPatients(): Promise<Identified<Patient>[]>;
  getPatient(id: string): Promise<Identified<Patient> | null>;
  /** Encounters, Conditions and Observations whose subject is the patient. */
  getClinicalResources(patientId: string): Promise<ClinicalResource[]>;
  /** `Type/id` (and, for local data, `urn:uuid:`); null when unknown. */
  resolve(
    reference: Reference | undefined,
  ): Promise<Identified<FhirResource> | null>;
}
