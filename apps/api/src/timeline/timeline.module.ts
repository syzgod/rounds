import { Module } from '@nestjs/common';
import { AcknowledgementsModule } from '../acknowledgements/acknowledgements.module.js';
import { FhirModule } from '../fhir/fhir.module.js';
import { PatientTimelineResolver } from './patient-timeline.resolver.js';
import { TimelineEventResolver } from './timeline-event.resolver.js';
import { TimelineService } from './timeline.service.js';

@Module({
  imports: [FhirModule, AcknowledgementsModule],
  providers: [TimelineService, PatientTimelineResolver, TimelineEventResolver],
})
export class TimelineModule {}
