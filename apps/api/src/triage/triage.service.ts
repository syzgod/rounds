import { Injectable } from '@nestjs/common';
import type { Condition, Observation } from 'fhir/r4.js';
import {
  isCondition,
  isObservation,
  type Identified,
} from '../fhir/fhir-guards.js';
import { AcknowledgementService } from '../acknowledgements/acknowledgement.service.js';
import { FhirRepositoryService } from '../fhir/fhir-repository.service.js';
import { abnormalResultCount, activeDiagnosisLabels } from './triage.mapper.js';

@Injectable()
export class TriageService {
  constructor(
    private readonly fhir: FhirRepositoryService,
    private readonly acknowledgements: AcknowledgementService,
  ) {}

  getActiveDiagnoses(patientId: string): string[] {
    const conditions: Identified<Condition>[] = [];
    for (const resource of this.fhir.getClinicalResources(patientId)) {
      if (isCondition(resource)) conditions.push(resource);
    }
    return activeDiagnosisLabels(conditions);
  }

  getAbnormalResultCount(patientId: string): number {
    const observations: Identified<Observation>[] = [];
    for (const resource of this.fhir.getClinicalResources(patientId)) {
      if (isObservation(resource)) observations.push(resource);
    }
    return abnormalResultCount(observations, (id) =>
      this.acknowledgements.isAcknowledged(id),
    );
  }
}
