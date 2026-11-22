import { Injectable } from '@nestjs/common';
import { isClinicalResource } from '../fhir/fhir-guards.js';
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

  /** One event by its `"<ResourceType>/<id>"` id; null for unknown ids or non-timeline types. */
  getEvent(id: string): TimelineEventDto | null {
    const resource = this.fhir.resolve({ reference: id });
    return resource && isClinicalResource(resource)
      ? toTimelineEvent(resource)
      : null;
  }
}
