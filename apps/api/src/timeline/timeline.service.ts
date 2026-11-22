import { Injectable } from '@nestjs/common';
import type { Observation } from 'fhir/r4.js';
import { AcknowledgementService } from '../acknowledgements/acknowledgement.service.js';
import {
  type Identified,
  isClinicalResource,
  isObservation,
} from '../fhir/fhir-guards.js';
import { FhirRepositoryService } from '../fhir/fhir-repository.service.js';
import { openResultIds } from '../triage/triage.mapper.js';
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
    const open = this.openResults(patientId);
    return this.fhir
      .getClinicalResources(patientId)
      .map((resource) => this.decorate(toTimelineEvent(resource), open))
      .sort(compareTimelineEvents);
  }

  /** One event by its `"<ResourceType>/<id>"` id; null for unknown ids or non-timeline types. */
  getEvent(id: string): TimelineEventDto | null {
    const resource = this.fhir.resolve({ reference: id });
    if (!resource || !isClinicalResource(resource)) return null;
    const patientId = this.fhir.resolve(resource.subject)?.id;
    const open = patientId ? this.openResults(patientId) : new Set<string>();
    return this.decorate(toTimelineEvent(resource), open);
  }

  /** Acknowledges a flagged result and returns the updated event. */
  acknowledge(id: string, initials: string): TimelineEventDto | null {
    this.acknowledgements.acknowledge(id, initials);
    return this.getEvent(id);
  }

  private openResults(patientId: string): Set<string> {
    const observations: Identified<Observation>[] = [];
    for (const resource of this.fhir.getClinicalResources(patientId)) {
      if (isObservation(resource)) observations.push(resource);
    }
    return openResultIds(observations, (id) =>
      this.acknowledgements.isAcknowledged(id),
    );
  }

  /** `event` is fresh from the mapper, so setting fields on it is safe. */
  private decorate(
    event: TimelineEventDto,
    open: ReadonlySet<string>,
  ): TimelineEventDto {
    const ack = this.acknowledgements.get(event.id);
    if (ack) {
      event.acknowledgedAt = ack.at;
      event.acknowledgedBy = ack.by;
    }
    event.needsAcknowledgement = open.has(event.id);
    return event;
  }
}
