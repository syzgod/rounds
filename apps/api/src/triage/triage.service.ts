import { Injectable } from '@nestjs/common';
import type { Condition, Observation } from 'fhir/r4.js';
import { AcknowledgementService } from '../acknowledgements/acknowledgement.service.js';
import { DataSource } from '../fhir/data-source.js';
import {
  isCondition,
  isObservation,
  type Identified,
} from '../fhir/fhir-guards.js';
import { FhirSourcesService } from '../fhir/fhir-sources.service.js';
import { abnormalResultCount, activeDiagnosisLabels } from './triage.mapper.js';

@Injectable()
export class TriageService {
  constructor(
    private readonly sources: FhirSourcesService,
    private readonly acknowledgements: AcknowledgementService,
  ) {}

  async getActiveDiagnoses(patientId: string): Promise<string[]> {
    const { fhir, id } = this.sources.forId(patientId);
    const conditions: Identified<Condition>[] = [];
    for (const resource of await fhir.getClinicalResources(id)) {
      if (isCondition(resource)) conditions.push(resource);
    }
    return activeDiagnosisLabels(conditions);
  }

  async getAbnormalResultCount(patientId: string): Promise<number> {
    const { source, fhir, id } = this.sources.forId(patientId);
    const observations: Identified<Observation>[] = [];
    for (const resource of await fhir.getClinicalResources(id)) {
      if (isObservation(resource)) observations.push(resource);
    }
    // Acknowledgements exist only for local data.
    return abnormalResultCount(
      observations,
      (eventId) =>
        source === DataSource.LOCAL &&
        this.acknowledgements.isAcknowledged(eventId),
    );
  }
}
