import { Injectable } from '@nestjs/common';
import { withSource } from '../fhir/data-source.js';
import { isObservation } from '../fhir/fhir-guards.js';
import { FhirSourcesService } from '../fhir/fhir-sources.service.js';
import type { TrendDto } from './dto/trend.dto.js';
import {
  buildTrends,
  toTrendReading,
  type TrendReading,
} from './trends.mapper.js';

@Injectable()
export class TrendsService {
  constructor(private readonly sources: FhirSourcesService) {}

  /** Numeric measurement series with at least two dated values for the patient. */
  async getTrends(patientId: string): Promise<TrendDto[]> {
    const { source, fhir, id } = this.sources.forId(patientId);
    const readings: TrendReading[] = [];
    for (const resource of await fhir.getClinicalResources(id)) {
      if (!isObservation(resource)) continue;
      const reading = toTrendReading(resource);
      if (reading) readings.push(reading);
    }
    const trends = buildTrends(id, readings);
    for (const trend of trends) {
      trend.id = withSource(trend.id, source);
      for (const point of trend.points) point.id = withSource(point.id, source);
    }
    return trends;
  }
}
