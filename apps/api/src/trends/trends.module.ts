import { Module } from '@nestjs/common';
import { FhirModule } from '../fhir/fhir.module.js';
import { PatientTrendsResolver } from './patient-trends.resolver.js';
import { TrendsService } from './trends.service.js';

@Module({
  imports: [FhirModule],
  providers: [TrendsService, PatientTrendsResolver],
})
export class TrendsModule {}
