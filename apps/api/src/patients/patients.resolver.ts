import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { DataSource } from '../fhir/data-source.js';
import { PatientDto } from './dto/patient.dto.js';
import { PatientsService } from './patients.service.js';

@Resolver(() => PatientDto)
export class PatientsResolver {
  constructor(private readonly patientsService: PatientsService) {}

  @Query(() => [PatientDto], {
    description:
      'All patients of a source, sorted by display name. LIVE reads a public FHIR test server.',
  })
  patients(
    @Args('source', {
      type: () => DataSource,
      defaultValue: DataSource.LOCAL,
    })
    source: DataSource,
  ): Promise<PatientDto[]> {
    return this.patientsService.findAll(source);
  }

  @Query(() => PatientDto, {
    nullable: true,
    description:
      'One patient by id ("live-<id>" for the live server); null when no such patient exists.',
  })
  patient(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<PatientDto | null> {
    return this.patientsService.findById(id);
  }
}
