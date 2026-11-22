import { Injectable } from '@nestjs/common';
import { isObservation } from '../fhir/fhir-guards.js';
import { FhirRepositoryService } from '../fhir/fhir-repository.service.js';
import type { TrendDto } from './dto/trend.dto.js';
import {
  buildTrends,
  toTrendReading,
  type TrendReading,
} from './trends.mapper.js';

@Injectable()
export class TrendsService {
  constructor(private readonly fhir: FhirRepositoryService) {}

  /** Numeric measurement series with at least two dated values for the patient. */
  getTrends(patientId: string): TrendDto[] {
    const readings: TrendReading[] = [];
    for (const resource of this.fhir.getClinicalResources(patientId)) {
      if (!isObservation(resource)) continue;
      const reading = toTrendReading(resource);
      if (reading) readings.push(reading);
    }
    return buildTrends(patientId, readings);
  }
}
