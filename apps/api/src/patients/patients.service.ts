import { Injectable } from '@nestjs/common';
import { DataSource, withSource } from '../fhir/data-source.js';
import { FhirSourcesService } from '../fhir/fhir-sources.service.js';
import type { PatientDto } from './dto/patient.dto.js';
import { toPatientDto } from './patient.mapper.js';

@Injectable()
export class PatientsService {
  constructor(private readonly sources: FhirSourcesService) {}

  /** All patients of a source, sorted by display name (then id, for a stable order). */
  async findAll(source: DataSource = DataSource.LOCAL): Promise<PatientDto[]> {
    const patients = await this.sources.get(source).getPatients();
    return patients
      .map((patient) => scoped(toPatientDto(patient), source))
      .sort(
        (a, b) =>
          a.displayName.localeCompare(b.displayName, 'en') ||
          a.id.localeCompare(b.id, 'en'),
      );
  }

  /** One patient by scoped id ("live-…" for the live server). */
  async findById(id: string): Promise<PatientDto | null> {
    const { source, fhir, id: sourceId } = this.sources.forId(id);
    const patient = await fhir.getPatient(sourceId);
    return patient ? scoped(toPatientDto(patient), source) : null;
  }
}

function scoped(patient: PatientDto, source: DataSource): PatientDto {
  patient.id = withSource(patient.id, source);
  return patient;
}
