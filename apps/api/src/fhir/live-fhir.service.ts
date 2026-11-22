import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { FhirResource, Patient, Reference } from 'fhir/r4.js';
import {
  type ClinicalResource,
  type Identified,
  isBundle,
  isClinicalResource,
  isIdentifiedResource,
  isPatient,
} from './fhir-guards.js';
import type { FhirSource } from './fhir-source.js';

/** Injection token for the live server's base URL. */
export const FHIR_SERVER_URL = Symbol('FHIR_SERVER_URL');

/**
 * Synthea patients on the SMART Health IT sandbox with many diagnoses and
 * 60–240 Observations, picked for a full timeline. Another server needs its
 * own list (set FHIR_LIVE_PATIENT_IDS, comma-separated).
 */
export const DEFAULT_LIVE_PATIENT_IDS = [
  '7a18395e-05fb-44ad-9481-82774944b537',
  '835a3b08-e3b6-49c4-a23f-1fac8dc7a7a7',
  '3afaeb2a-9f18-40b5-8fe7-dfd882de2f2b',
  '71a8a403-9ec4-4677-96f6-5a1f53c89da0',
  '98671a34-1c6e-4569-a1bc-6ee40c8d03a5',
  'f03992c7-caa3-4534-9776-8e83259bb98e',
  '43400618-8533-406d-8303-af7cc5714549',
  '76d2fa2d-66a6-4823-8dab-52cd70822844',
];
export const FHIR_LIVE_PATIENT_IDS = Symbol('FHIR_LIVE_PATIENT_IDS');

const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 15_000;

type Cached = { value: Promise<unknown>; expires: number };

/**
 * Read-only FHIR R4 client for the live test server, with a 10-minute
 * in-memory cache (the sandbox needs about 1 s per request).
 */
@Injectable()
export class LiveFhirService implements FhirSource {
  private readonly logger = new Logger(LiveFhirService.name);
  private readonly cache = new Map<string, Cached>();

  constructor(
    @Inject(FHIR_SERVER_URL) private readonly baseUrl: string,
    @Inject(FHIR_LIVE_PATIENT_IDS) private readonly patientIds: string[],
  ) {}

  async getPatients(): Promise<Identified<Patient>[]> {
    const resources = await this.search(
      `Patient?_id=${this.patientIds.join(',')}&_count=${this.patientIds.length}`,
    );
    const patients: Identified<Patient>[] = [];
    for (const resource of resources) {
      if (isPatient(resource)) patients.push(resource);
    }
    return patients;
  }

  async getPatient(id: string): Promise<Identified<Patient> | null> {
    if (!this.patientIds.includes(id)) return null;
    const resource = await this.read(`Patient/${id}`);
    return resource && isPatient(resource) ? resource : null;
  }

  async getClinicalResources(patientId: string): Promise<ClinicalResource[]> {
    if (!this.patientIds.includes(patientId)) return [];
    const id = encodeURIComponent(patientId);
    const pages = await Promise.all([
      this.search(`Encounter?patient=${id}&_sort=-date&_count=100`),
      this.search(`Condition?patient=${id}&_count=100`),
      this.search(`Observation?patient=${id}&_sort=-date&_count=250`),
    ]);
    return pages.flat().filter(isClinicalResource);
  }

  async resolve(
    reference: Reference | undefined,
  ): Promise<Identified<FhirResource> | null> {
    const key = reference?.reference;
    return key && /^[A-Za-z]+\/[A-Za-z0-9\-.]{1,64}$/.test(key)
      ? this.read(key)
      : null;
  }

  private async read(path: string): Promise<Identified<FhirResource> | null> {
    const json = await this.get(path, true);
    return isIdentifiedResource(json) ? json : null;
  }

  private async search(path: string): Promise<Identified<FhirResource>[]> {
    const json = await this.get(path, false);
    if (!isBundle(json)) return [];
    const resources: Identified<FhirResource>[] = [];
    for (const entry of json.entry ?? []) {
      const resource: unknown = entry.resource;
      if (isIdentifiedResource(resource)) resources.push(resource);
    }
    return resources;
  }

  /**
   * GET with cache; `null` for 404 on a read, an error for anything else.
   * The cache holds the promise, so parallel callers share one request.
   */
  private get(path: string, allowNotFound: boolean): Promise<unknown> {
    const cached = this.cache.get(path);
    if (cached && cached.expires > Date.now()) return cached.value;
    const value = this.fetchJson(path, allowNotFound);
    this.cache.set(path, { value, expires: Date.now() + TTL_MS });
    // A failed request must not stay cached.
    value.catch(() => this.cache.delete(path));
    return value;
  }

  private async fetchJson(
    path: string,
    allowNotFound: boolean,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${path}`, {
        headers: { Accept: 'application/fhir+json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`GET ${path} failed: ${String(error)}`);
      throw new ServiceUnavailableException(
        'The FHIR test server is not reachable.',
      );
    }
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      this.logger.warn(`GET ${path} returned ${response.status}`);
      throw new ServiceUnavailableException(
        'The FHIR test server is not reachable.',
      );
    }
    const json: unknown = await response.json();
    return json;
  }
}
