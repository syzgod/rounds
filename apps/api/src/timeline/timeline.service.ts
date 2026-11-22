import { Injectable } from '@nestjs/common';
import { AcknowledgementService } from '../acknowledgements/acknowledgement.service.js';
import { isClinicalResource } from '../fhir/fhir-guards.js';
import { FhirRepositoryService } from '../fhir/fhir-repository.service.js';
import type { TimelineEventDto } from './dto/timeline-event.dto.js';
import { compareTimelineEvents, toTimelineEvent } from './timeline.mapper.js';

@Injectable()
export class TimelineService {
  constructor(
    private readonly fhir: FhirRepositoryService,
    private readonly acknowledgements: AcknowledgementService,
  ) {}

  /** The patient's Encounters, Conditions and Observations, newest first. */
  getTimeline(patientId: string): TimelineEventDto[] {
    return this.fhir
      .getClinicalResources(patientId)
      .map((resource) => this.withAcknowledgement(toTimelineEvent(resource)))
      .sort(compareTimelineEvents);
  }

  /** One event by its `"<ResourceType>/<id>"` id; null for unknown ids or non-timeline types. */
  getEvent(id: string): TimelineEventDto | null {
    const resource = this.fhir.resolve({ reference: id });
    return resource && isClinicalResource(resource)
      ? this.withAcknowledgement(toTimelineEvent(resource))
      : null;
  }

  /** Acknowledges a flagged result and returns the updated event. */
  acknowledge(id: string, initials: string): TimelineEventDto | null {
    this.acknowledgements.acknowledge(id, initials);
    return this.getEvent(id);
  }

  /** `event` is fresh from the mapper, so setting fields on it is safe. */
  private withAcknowledgement(event: TimelineEventDto): TimelineEventDto {
    const ack = this.acknowledgements.get(event.id);
    if (ack) {
      event.acknowledgedAt = ack.at;
      event.acknowledgedBy = ack.by;
    }
    return event;
  }
}
