import { Module } from '@nestjs/common';
import { FhirModule } from '../fhir/fhir.module.js';
import {
  AcknowledgementService,
  CLOCK,
  type Clock,
} from './acknowledgement.service.js';
import { PatientAuditLogResolver } from './patient-audit-log.resolver.js';

@Module({
  imports: [FhirModule],
  providers: [
    AcknowledgementService,
    PatientAuditLogResolver,
    { provide: CLOCK, useValue: ((): Date => new Date()) satisfies Clock },
  ],
  exports: [AcknowledgementService],
})
export class AcknowledgementsModule {}
