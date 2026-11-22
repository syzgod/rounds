import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import {
  FHIR_DATA_DIR,
  FhirRepositoryService,
} from './fhir-repository.service.js';
import { FhirSourcesService } from './fhir-sources.service.js';
import {
  DEFAULT_LIVE_PATIENT_IDS,
  FHIR_LIVE_PATIENT_IDS,
  FHIR_SERVER_URL,
  LiveFhirService,
} from './live-fhir.service.js';

@Module({
  providers: [
    {
      provide: FHIR_DATA_DIR,
      // Scripts run with cwd = apps/api, so the default points at <repo>/data/fhir.
      useFactory: (): string =>
        resolve(process.env.FHIR_DATA_DIR ?? '../../data/fhir'),
    },
    {
      provide: FHIR_SERVER_URL,
      // Any FHIR R4 server works, e.g. https://hapi.fhir.org/baseR4 (then set
      // FHIR_LIVE_PATIENT_IDS too: the default ids exist only on SMART).
      useFactory: (): string =>
        (process.env.FHIR_SERVER_URL ?? 'https://r4.smarthealthit.org').replace(
          /\/$/,
          '',
        ),
    },
    {
      provide: FHIR_LIVE_PATIENT_IDS,
      useFactory: (): string[] =>
        process.env.FHIR_LIVE_PATIENT_IDS?.split(',')
          .map((id) => id.trim())
          .filter(Boolean) ?? DEFAULT_LIVE_PATIENT_IDS,
    },
    FhirRepositoryService,
    LiveFhirService,
    FhirSourcesService,
  ],
  exports: [FhirRepositoryService, FhirSourcesService],
})
export class FhirModule {}
