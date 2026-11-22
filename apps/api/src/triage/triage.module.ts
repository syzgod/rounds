import { Module } from '@nestjs/common';
import { FhirModule } from '../fhir/fhir.module.js';
import { PatientTriageResolver } from './patient-triage.resolver.js';
import { TriageService } from './triage.service.js';

@Module({
  imports: [FhirModule],
  providers: [TriageService, PatientTriageResolver],
})
export class TriageModule {}
