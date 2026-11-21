import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import {
  FHIR_DATA_DIR,
  FhirRepositoryService,
} from './fhir-repository.service.js';

@Module({
  providers: [
    {
      provide: FHIR_DATA_DIR,
      // Scripts run with cwd = apps/api, so the default points at <repo>/data/fhir.
      useFactory: (): string =>
        resolve(process.env.FHIR_DATA_DIR ?? '../../data/fhir'),
    },
    FhirRepositoryService,
  ],
  exports: [FhirRepositoryService],
})
export class FhirModule {}
