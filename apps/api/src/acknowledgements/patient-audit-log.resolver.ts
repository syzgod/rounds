import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PatientDto } from '../patients/dto/patient.dto.js';
import { AcknowledgementService } from './acknowledgement.service.js';
import { AuditEntryDto } from './dto/audit-entry.dto.js';

/** Adds the audit log to `Patient`. */
@Resolver(() => PatientDto)
export class PatientAuditLogResolver {
  constructor(private readonly acknowledgements: AcknowledgementService) {}

  @ResolveField(() => [AuditEntryDto], {
    description: 'Audit entries for this patient, newest first.',
  })
  auditLog(@Parent() patient: PatientDto): AuditEntryDto[] {
    return this.acknowledgements.auditLog(patient.id);
  }
}
