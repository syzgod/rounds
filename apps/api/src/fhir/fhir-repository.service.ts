import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { FhirResource, Patient, Reference } from 'fhir/r4.js';
import {
  type ClinicalResource,
  type Identified,
  isBundle,
  isClinicalResource,
  isIdentifiedResource,
  isPatient,
} from './fhir-guards.js';

/** Injection token for the directory holding the fixture bundles. */
export const FHIR_DATA_DIR = Symbol('FHIR_DATA_DIR');

/**
 * The only reader of `data/fhir/`. Loads every bundle once at startup and
 * indexes each resource under `ResourceType/id` and under its `fullUrl`, so
 * both reference forms resolve through {@link resolve}.
 */
@Injectable()
export class FhirRepositoryService implements OnModuleInit {
  private readonly logger = new Logger(FhirRepositoryService.name);
  private readonly resources: Identified<FhirResource>[] = [];
  private readonly byKey = new Map<string, Identified<FhirResource>>();

  constructor(@Inject(FHIR_DATA_DIR) private readonly dataDir: string) {}

  async onModuleInit(): Promise<void> {
    const files = (await readdir(this.dataDir))
      .filter((file) => file.endsWith('.json'))
      .sort();
    for (const file of files) {
      const parsed: unknown = JSON.parse(
        await readFile(join(this.dataDir, file), 'utf8'),
      );
      this.indexBundle(file, parsed);
    }
    this.logger.log(
      `Loaded ${this.resources.length} FHIR resources from ${files.length} bundles`,
    );
  }

  getPatients(): Identified<Patient>[] {
    const patients: Identified<Patient>[] = [];
    for (const resource of this.resources) {
      if (isPatient(resource)) patients.push(resource);
    }
    return patients;
  }

  getPatient(id: string): Identified<Patient> | null {
    const resource = this.byKey.get(`Patient/${id}`);
    return isPatient(resource) ? resource : null;
  }

  /** Encounters, Conditions and Observations whose `subject` resolves to the patient. */
  getClinicalResources(patientId: string): ClinicalResource[] {
    const result: ClinicalResource[] = [];
    for (const resource of this.resources) {
      if (!isClinicalResource(resource)) continue;
      const subject = this.resolve(resource.subject);
      if (subject?.resourceType === 'Patient' && subject.id === patientId) {
        result.push(resource);
      }
    }
    return result;
  }

  /** Resolves `Type/id`, `urn:uuid:<uuid>` or an absolute `fullUrl`; `null` when unknown. */
  resolve(reference: Reference | undefined): Identified<FhirResource> | null {
    const key = reference?.reference;
    return key ? (this.byKey.get(key) ?? null) : null;
  }

  private indexBundle(file: string, parsed: unknown): void {
    if (!isBundle(parsed)) {
      throw new Error(`${file}: not a FHIR Bundle`);
    }
    for (const [index, entry] of (parsed.entry ?? []).entries()) {
      const resource: unknown = entry.resource;
      if (!isIdentifiedResource(resource)) {
        throw new Error(
          `${file}: entry ${index} has no resource with a resourceType and id`,
        );
      }
      const keys = [`${resource.resourceType}/${resource.id}`];
      if (entry.fullUrl) keys.push(entry.fullUrl);
      for (const key of keys) {
        if (this.byKey.has(key)) {
          throw new Error(`${file}: duplicate resource key ${key}`);
        }
        this.byKey.set(key, resource);
      }
      this.resources.push(resource);
    }
  }
}
