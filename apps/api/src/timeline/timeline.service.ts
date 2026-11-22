import { Injectable } from '@nestjs/common';
import type { Observation } from 'fhir/r4.js';
import { AcknowledgementService } from '../acknowledgements/acknowledgement.service.js';
import { DataSource, withSource } from '../fhir/data-source.js';
import {
  type ClinicalResource,
  type Identified,
  isClinicalResource,
  isObservation,
} from '../fhir/fhir-guards.js';
import { FhirSourcesService } from '../fhir/fhir-sources.service.js';
import { openResultIds } from '../triage/triage.mapper.js';
import type { TimelineEventDto } from './dto/timeline-event.dto.js';
import { compareTimelineEvents, toTimelineEvent } from './timeline.mapper.js';

@Injectable()
export class TimelineService {
  constructor(
    private readonly sources: FhirSourcesService,
    private readonly acknowledgements: AcknowledgementService,
  ) {}

  /** The patient's Encounters, Conditions and Observations, newest first. */
  async getTimeline(patientId: string): Promise<TimelineEventDto[]> {
    const { source, fhir, id } = this.sources.forId(patientId);
    const resources = await fhir.getClinicalResources(id);
    const open = this.openResults(resources, source);
    return resources
      .map((resource) => this.decorate(toTimelineEvent(resource), open, source))
      .sort(compareTimelineEvents);
  }

  /** One event by scoped `"<ResourceType>/<id>"` id; null for unknown ids or non-timeline types. */
  async getEvent(id: string): Promise<TimelineEventDto | null> {
    const { source, fhir, id: sourceId } = this.sources.forId(id);
    const resource = await fhir.resolve({ reference: sourceId });
    if (!resource || !isClinicalResource(resource)) return null;
    const patient = await fhir.resolve(resource.subject);
    const resources = patient
      ? await fhir.getClinicalResources(patient.id)
      : [];
    const open = this.openResults(resources, source);
    return this.decorate(toTimelineEvent(resource), open, source);
  }

  /** Acknowledges a flagged result and returns the updated event. */
  async acknowledge(
    id: string,
    initials: string,
  ): Promise<TimelineEventDto | null> {
    this.acknowledgements.acknowledge(id, initials);
    return this.getEvent(id);
  }

  private openResults(
    resources: readonly ClinicalResource[],
    source: DataSource,
  ): Set<string> {
    // Live data is read-only: no open results to acknowledge.
    if (source === DataSource.LIVE) return new Set();
    const observations: Identified<Observation>[] = [];
    for (const resource of resources) {
      if (isObservation(resource)) observations.push(resource);
    }
    return openResultIds(observations, (eventId) =>
      this.acknowledgements.isAcknowledged(eventId),
    );
  }

  /** `event` is fresh from the mapper, so setting fields on it is safe. */
  private decorate(
    event: TimelineEventDto,
    open: ReadonlySet<string>,
    source: DataSource,
  ): TimelineEventDto {
    const ack =
      source === DataSource.LOCAL ? this.acknowledgements.get(event.id) : null;
    if (ack) {
      event.acknowledgedAt = ack.at;
      event.acknowledgedBy = ack.by;
    }
    event.needsAcknowledgement = open.has(event.id);
    event.id = withSource(event.id, source);
    return event;
  }
}
