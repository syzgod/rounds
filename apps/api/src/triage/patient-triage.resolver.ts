import { Int } from '@nestjs/graphql';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PatientDto } from '../patients/dto/patient.dto.js';
import { TriageService } from './triage.service.js';

/** Adds the ward-rounds triage fields to `Patient`. */
@Resolver(() => PatientDto)
export class PatientTriageResolver {
  constructor(private readonly triageService: TriageService) {}

  @ResolveField(() => [String], {
    description:
      'Labels of active, recurring or relapsed Conditions, newest first.',
  })
  activeDiagnoses(@Parent() patient: PatientDto): string[] {
    return this.triageService.getActiveDiagnoses(patient.id);
  }

  @ResolveField(() => Int, {
    description:
      'Distinct measurements whose latest value is flagged high, low or abnormal.',
  })
  abnormalResultCount(@Parent() patient: PatientDto): number {
    return this.triageService.getAbnormalResultCount(patient.id);
  }
}
