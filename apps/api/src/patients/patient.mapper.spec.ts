import type { Patient } from 'fhir/r4.js';
import { isPatient, type Identified } from '../fhir/fhir-guards.js';
import { Gender } from './dto/patient.dto.js';
import {
  formatName,
  selectName,
  toPatientDto,
  UNNAMED_PATIENT,
} from './patient.mapper.js';

const MR_TYPE = {
  coding: [
    {
      system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
      code: 'MR',
      display: 'Medical record number',
    },
  ],
};

describe('toPatientDto', () => {
  it('maps a full patient, preferring the official name over an earlier nickname', () => {
    const patient: Identified<Patient> = {
      resourceType: 'Patient',
      id: 'pat-full',
      identifier: [
        { system: 'http://example.org/ssn', value: '000-00-0000' },
        {
          type: MR_TYPE,
          system: 'http://hospital.example.org/mrn',
          value: 'MRN-1',
        },
      ],
      name: [
        { use: 'nickname', given: ['Amy'] },
        {
          use: 'official',
          family: 'Hartwell',
          given: ['Amelia', 'Rose'],
          prefix: ['Ms.'],
        },
      ],
      gender: 'female',
      birthDate: '1985-12-10',
    };

    expect(toPatientDto(patient)).toEqual({
      id: 'pat-full',
      displayName: 'Amelia Rose Hartwell',
      gender: Gender.FEMALE,
      birthDate: '1985-12-10',
      mrn: 'MRN-1',
    });
  });

  it('maps a minimal patient to nulls instead of throwing', () => {
    const patient: Identified<Patient> = {
      resourceType: 'Patient',
      id: 'pat-min',
      name: [{ family: 'Okafor' }],
    };

    expect(toPatientDto(patient)).toEqual({
      id: 'pat-min',
      displayName: 'Okafor',
      gender: null,
      birthDate: null,
      mrn: null,
    });
  });

  it('falls back to a placeholder when the patient has no usable name', () => {
    const patient: Identified<Patient> = {
      resourceType: 'Patient',
      id: 'pat-anon',
      name: [{ given: ['  '] }],
    };

    expect(toPatientDto(patient).displayName).toBe(UNNAMED_PATIENT);
  });
});

describe('selectName / formatName', () => {
  it('prefers usual over unlabelled, and unlabelled over nickname or old names', () => {
    expect(
      selectName([
        { use: 'old', family: 'A' },
        { use: 'usual', family: 'B' },
      ])?.family,
    ).toBe('B');
    expect(
      selectName([{ use: 'nickname', family: 'A' }, { family: 'B' }])?.family,
    ).toBe('B');
    expect(selectName([{ use: 'old', family: 'A' }])?.family).toBe('A');
    expect(selectName([])).toBeNull();
    expect(selectName(undefined)).toBeNull();
  });

  it('uses HumanName.text when it is the only representation', () => {
    expect(formatName({ text: 'Priya Natarajan' })).toBe('Priya Natarajan');
  });

  it('returns null for an empty name', () => {
    expect(formatName({})).toBeNull();
    expect(formatName(null)).toBeNull();
  });
});

describe('isPatient', () => {
  it('rejects malformed input before it reaches the mapper', () => {
    expect(isPatient({ id: 'no-resource-type', name: [{ family: 'X' }] })).toBe(
      false,
    );
    expect(isPatient({ resourceType: 'Observation', id: 'obs-1' })).toBe(false);
    expect(isPatient(null)).toBe(false);
    expect(isPatient([])).toBe(false);
    expect(isPatient({ resourceType: 'Patient', id: 'pat-1' })).toBe(true);
  });
});
