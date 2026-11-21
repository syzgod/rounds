import { Module } from '@nestjs/common';
import { FhirModule } from '../fhir/fhir.module.js';
import { PatientTimelineResolver } from './patient-timeline.resolver.js';
import { TimelineService } from './timeline.service.js';

@Module({
  imports: [FhirModule],
  providers: [TimelineService, PatientTimelineResolver],
})
export class TimelineModule {}
