import { Module } from '@nestjs/common';
import { AcknowledgementsModule } from '../acknowledgements/acknowledgements.module.js';
import { FhirModule } from '../fhir/fhir.module.js';
import { PatientTriageResolver } from './patient-triage.resolver.js';
import { TriageService } from './triage.service.js';

@Module({
  imports: [FhirModule, AcknowledgementsModule],
  providers: [TriageService, PatientTriageResolver],
})
export class TriageModule {}
