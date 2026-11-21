import type { HumanName, Identifier, Patient } from 'fhir/r4.js';
import type { Identified } from '../fhir/fhir-guards.js';
import { Gender, type PatientDto } from './dto/patient.dto.js';

export const UNNAMED_PATIENT = 'Unnamed patient';

const IDENTIFIER_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v2-0203';
const LOW_PRIORITY_NAME_USES = new Set<HumanName['use']>([
  'nickname',
  'anonymous',
  'old',
  'maiden',
]);

const GENDER_BY_CODE: Record<NonNullable<Patient['gender']>, Gender> = {
  male: Gender.MALE,
  female: Gender.FEMALE,
  other: Gender.OTHER,
  unknown: Gender.UNKNOWN,
};

/** Picks the name to display: official, then usual, then any everyday name, then the first. */
export function selectName(
  names: readonly HumanName[] | undefined,
): HumanName | null {
  if (!names || names.length === 0) return null;
  return (
    names.find((name) => name.use === 'official') ??
    names.find((name) => name.use === 'usual') ??
    names.find((name) => !LOW_PRIORITY_NAME_USES.has(name.use)) ??
    names[0]
  );
}

/** `HumanName.text` when present, otherwise given names followed by family; prefixes omitted. */
export function formatName(name: HumanName | null): string | null {
  if (!name) return null;
  const text = name.text?.trim();
  if (text) return text;
  const parts = [...(name.given ?? []), name.family ?? '']
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(' ') : null;
}

function findMrn(
  identifiers: readonly Identifier[] | undefined,
): string | null {
  const mrn = identifiers?.find((identifier) =>
    identifier.type?.coding?.some(
      (coding) =>
        coding.system === IDENTIFIER_TYPE_SYSTEM && coding.code === 'MR',
    ),
  );
  return mrn?.value ?? null;
}

export function toPatientDto(patient: Identified<Patient>): PatientDto {
  return {
    id: patient.id,
    displayName: formatName(selectName(patient.name)) ?? UNNAMED_PATIENT,
    gender: patient.gender ? GENDER_BY_CODE[patient.gender] : null,
    birthDate: patient.birthDate ?? null,
    mrn: findMrn(patient.identifier),
  };
}
