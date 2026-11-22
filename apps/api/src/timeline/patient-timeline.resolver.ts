import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PatientDto } from '../patients/dto/patient.dto.js';
import { TimelineEventDto } from './dto/timeline-event.dto.js';
import { TimelineService } from './timeline.service.js';

/** Adds `Patient.timeline`; resolved only when a query selects it. */
@Resolver(() => PatientDto)
export class PatientTimelineResolver {
  constructor(private readonly timelineService: TimelineService) {}

  @ResolveField(() => [TimelineEventDto], {
    description:
      "The patient's Encounters, Conditions and Observations, newest first; undated events last.",
  })
  timeline(@Parent() patient: PatientDto): Promise<TimelineEventDto[]> {
    return this.timelineService.getTimeline(patient.id);
  }
}
