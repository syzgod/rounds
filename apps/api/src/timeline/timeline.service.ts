import { Injectable } from '@nestjs/common';
import { FhirRepositoryService } from '../fhir/fhir-repository.service.js';
import type { TimelineEventDto } from './dto/timeline-event.dto.js';
import { compareTimelineEvents, toTimelineEvent } from './timeline.mapper.js';

@Injectable()
export class TimelineService {
  constructor(private readonly fhir: FhirRepositoryService) {}

  /** The patient's Encounters, Conditions and Observations, newest first. */
  getTimeline(patientId: string): TimelineEventDto[] {
    return this.fhir
      .getClinicalResources(patientId)
      .map((resource) => toTimelineEvent(resource))
      .sort(compareTimelineEvents);
  }
}
