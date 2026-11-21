import { Injectable } from '@nestjs/common';
import { FhirRepositoryService } from '../fhir/fhir-repository.service.js';
import type { PatientDto } from './dto/patient.dto.js';
import { toPatientDto } from './patient.mapper.js';

@Injectable()
export class PatientsService {
  constructor(private readonly fhir: FhirRepositoryService) {}

  /** All patients, sorted by display name (then id, for a stable order). */
  findAll(): PatientDto[] {
    return this.fhir
      .getPatients()
      .map((patient) => toPatientDto(patient))
      .sort(
        (a, b) =>
          a.displayName.localeCompare(b.displayName, 'en') ||
          a.id.localeCompare(b.id, 'en'),
      );
  }

  findById(id: string): PatientDto | null {
    const patient = this.fhir.getPatient(id);
    return patient ? toPatientDto(patient) : null;
  }
}
