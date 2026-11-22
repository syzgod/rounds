import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PatientDto } from '../patients/dto/patient.dto.js';
import { TrendDto } from './dto/trend.dto.js';
import { TrendsService } from './trends.service.js';

/** Adds `Patient.trends`; resolved only when a query selects it. */
@Resolver(() => PatientDto)
export class PatientTrendsResolver {
  constructor(private readonly trendsService: TrendsService) {}

  @ResolveField(() => [TrendDto], {
    description:
      'Numeric measurements with at least two dated values, for charts.',
  })
  trends(@Parent() patient: PatientDto): Promise<TrendDto[]> {
    return this.trendsService.getTrends(patient.id);
  }
}
