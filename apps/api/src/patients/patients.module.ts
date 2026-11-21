import { Module } from '@nestjs/common';
import { FhirModule } from '../fhir/fhir.module.js';
import { PatientsResolver } from './patients.resolver.js';
import { PatientsService } from './patients.service.js';

@Module({
  imports: [FhirModule],
  providers: [PatientsService, PatientsResolver],
})
export class PatientsModule {}
