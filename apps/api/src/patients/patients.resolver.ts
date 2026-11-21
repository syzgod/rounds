import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { PatientDto } from './dto/patient.dto.js';
import { PatientsService } from './patients.service.js';

@Resolver(() => PatientDto)
export class PatientsResolver {
  constructor(private readonly patientsService: PatientsService) {}

  @Query(() => [PatientDto], {
    description: 'All patients, sorted by display name.',
  })
  patients(): PatientDto[] {
    return this.patientsService.findAll();
  }

  @Query(() => PatientDto, {
    nullable: true,
    description: 'One patient by FHIR id; null when no such patient exists.',
  })
  patient(@Args('id', { type: () => ID }) id: string): PatientDto | null {
    return this.patientsService.findById(id);
  }
}
