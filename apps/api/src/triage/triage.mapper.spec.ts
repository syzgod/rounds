import type { Condition, Observation } from 'fhir/r4.js';
import type { Identified } from '../fhir/fhir-guards.js';
import { abnormalResultCount, activeDiagnosisLabels } from './triage.mapper.js';

const LOINC = 'http://loinc.org';
const subject = { reference: 'Patient/pat-1' };

function condition(
  id: string,
  text: string,
  status: string | undefined,
  date?: { onset?: string; recorded?: string },
): Identified<Condition> {
  return {
    resourceType: 'Condition',
    id,
    subject,
    code: { text },
    ...(status ? { clinicalStatus: { coding: [{ code: status }] } } : {}),
    ...(date?.onset ? { onsetDateTime: date.onset } : {}),
    ...(date?.recorded ? { recordedDate: date.recorded } : {}),
  };
}

function observation(
  id: string,
  code: string,
  date: string | undefined,
  interpretation?: string,
  system: string = LOINC,
): Identified<Observation> {
  return {
    resourceType: 'Observation',
    id,
    status: 'final',
    code: { coding: [{ system, code }] },
    subject,
    ...(date ? { effectiveDateTime: date } : {}),
    ...(interpretation
      ? { interpretation: [{ coding: [{ code: interpretation }] }] }
      : {}),
  };
}

describe('activeDiagnosisLabels', () => {
  it('keeps active, recurrence and relapse and drops other statuses', () => {
    const labels = activeDiagnosisLabels([
      condition('a', 'Asthma', 'active', { onset: '2020-01-01' }),
      condition('b', 'Gout', 'recurrence', { onset: '2019-01-01' }),
      condition('c', 'Lymphoma', 'relapse', { onset: '2018-01-01' }),
      condition('d', 'Sprain', 'resolved', { onset: '2024-01-01' }),
      condition('e', 'Flu', 'inactive', { onset: '2024-01-01' }),
      condition('f', 'Unknown status', undefined, { onset: '2024-01-01' }),
    ]);
    expect(labels).toEqual(['Asthma', 'Gout', 'Lymphoma']);
  });

  it('orders newest first using onset then recorded date, undated last', () => {
    const labels = activeDiagnosisLabels([
      condition('a', 'Undated', 'active'),
      condition('b', 'Old', 'active', { onset: '2010-05-01' }),
      condition('c', 'Recorded only', 'active', { recorded: '2022-03-01' }),
      condition('d', 'New', 'active', { onset: '2024-01-01T10:00:00Z' }),
    ]);
    expect(labels).toEqual(['New', 'Recorded only', 'Old', 'Undated']);
  });

  it('skips unlabelled conditions and breaks date ties by id', () => {
    const labels = activeDiagnosisLabels([
      condition('z', 'Undated Z', 'active'),
      condition('b', 'Same day B', 'active', { onset: '2024-01-01' }),
      condition('y', 'Undated Y', 'active'),
      condition('n', '', 'active', { onset: '2025-01-01' }),
      condition('a', 'Same day A', 'active', { onset: '2024-01-01' }),
    ]);
    expect(labels).toEqual([
      'Same day A',
      'Same day B',
      'Undated Y',
      'Undated Z',
    ]);
  });

  it('de-duplicates by label and returns [] when nothing is active', () => {
    expect(
      activeDiagnosisLabels([
        condition('a', 'Asthma', 'active', { onset: '2020-01-01' }),
        condition('b', 'Asthma', 'recurrence', { onset: '2022-01-01' }),
      ]),
    ).toEqual(['Asthma']);
    expect(activeDiagnosisLabels([])).toEqual([]);
  });
});

describe('abnormalResultCount', () => {
  it('counts distinct codes whose latest reading is flagged', () => {
    expect(
      abnormalResultCount([
        observation('a1', '1', '2024-01-01', 'H'),
        observation('a2', '1', '2024-06-01', 'HH'),
        observation('b1', '2', '2024-01-01', 'L'),
        observation('c1', '3', '2024-01-01', 'A'),
        observation('d1', '4', '2024-01-01', 'N'),
      ]),
    ).toBe(3);
  });

  it('lets a newer normal value supersede an older flagged one', () => {
    expect(
      abnormalResultCount([
        observation('a1', '1', '2024-01-01', 'H'),
        observation('a2', '1', '2024-06-01', 'N'),
        observation('a3', '1', '2023-01-01', 'L'),
      ]),
    ).toBe(0);
  });

  it('lets a newer flagged value supersede an older normal one', () => {
    expect(
      abnormalResultCount([
        observation('a1', '1', '2024-01-01'),
        observation('a2', '1', '2024-06-01', 'L'),
      ]),
    ).toBe(1);
  });

  it('breaks a same-time tie by the higher id, in any input order', () => {
    const flagged = observation('o1', '1', '2024-01-01T08:00:00Z', 'H');
    const normal = observation('o2', '1', '2024-01-01T08:00:00Z', 'N');
    expect(abnormalResultCount([flagged, normal])).toBe(0);
    expect(abnormalResultCount([normal, flagged])).toBe(0);
  });

  it('ignores undated observations', () => {
    expect(
      abnormalResultCount([
        observation('a1', '1', '2024-01-01', 'N'),
        observation('a2', '1', undefined, 'H'),
        observation('b1', '2', undefined, 'H'),
      ]),
    ).toBe(0);
  });

  it('falls back to the first coding code when there is no LOINC code', () => {
    expect(
      abnormalResultCount([
        observation('a1', 'x', '2024-01-01', 'H', 'http://example.org'),
        observation('a2', 'x', '2024-02-01', 'N', 'http://example.org'),
        observation('b1', 'y', '2024-01-01', 'H', 'http://example.org'),
      ]),
    ).toBe(1);
  });

  it('skips a latest flagged reading that was acknowledged', () => {
    const observations = [
      observation('a1', '1', '2024-01-01', 'H'),
      observation('b1', '2', '2024-01-01', 'L'),
    ];
    expect(
      abnormalResultCount(observations, (id) => id === 'Observation/a1'),
    ).toBe(1);
  });

  it('returns 0 for no observations', () => {
    expect(abnormalResultCount([])).toBe(0);
  });
});
