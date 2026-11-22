import { Injectable } from '@nestjs/common';
import { DataSource, sourceOf, stripSource } from './data-source.js';
import { FhirRepositoryService } from './fhir-repository.service.js';
import type { FhirSource } from './fhir-source.js';
import { LiveFhirService } from './live-fhir.service.js';

/** Picks the FHIR source for a request: by `DataSource`, or by an id's prefix. */
@Injectable()
export class FhirSourcesService {
  private readonly local: FhirSource;

  constructor(
    repository: FhirRepositoryService,
    private readonly live: LiveFhirService,
  ) {
    this.local = {
      getPatients: () => Promise.resolve(repository.getPatients()),
      getPatient: (id) => Promise.resolve(repository.getPatient(id)),
      getClinicalResources: (id) =>
        Promise.resolve(repository.getClinicalResources(id)),
      resolve: (reference) => Promise.resolve(repository.resolve(reference)),
    };
  }

  get(source: DataSource): FhirSource {
    return source === DataSource.LIVE ? this.live : this.local;
  }

  /** The source of a scoped id ("live-…" or local) and the id it knows. */
  forId(id: string): { source: DataSource; fhir: FhirSource; id: string } {
    const source = sourceOf(id);
    return { source, fhir: this.get(source), id: stripSource(id) };
  }
}
