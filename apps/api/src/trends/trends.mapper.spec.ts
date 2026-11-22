import type { Observation } from 'fhir/r4.js';
import type { Identified } from '../fhir/fhir-guards.js';
import { ObservationFlag } from '../timeline/dto/timeline-event.dto.js';
import {
  buildTrends,
  toTrendReading,
  type TrendReading,
} from './trends.mapper.js';

const LOINC = 'http://loinc.org';
const subject = { reference: 'Patient/pat-1' };

function quantity(
  id: string,
  code: string,
  text: string,
  date: string | undefined,
  value: number,
  unit: string,
  interpretation?: string,
): Identified<Observation> {
  return {
    resourceType: 'Observation',
    id,
    status: 'final',
    code: { coding: [{ system: LOINC, code }], text },
    subject,
    ...(date ? { effectiveDateTime: date } : {}),
    valueQuantity: { value, unit },
    ...(interpretation
      ? { interpretation: [{ coding: [{ code: interpretation }] }] }
      : {}),
  };
}

function bp(
  id: string,
  date: string,
  systolic: number,
  diastolic: number,
): Identified<Observation> {
  return {
    resourceType: 'Observation',
    id,
    status: 'final',
    code: {
      coding: [{ system: LOINC, code: '85354-9' }],
      text: 'Blood pressure',
    },
    subject,
    effectiveDateTime: date,
    component: [
      {
        code: { coding: [{ system: LOINC, code: '8480-6' }] },
        valueQuantity: { value: systolic, unit: 'mmHg' },
      },
      {
        code: { coding: [{ system: LOINC, code: '8462-4' }] },
        valueQuantity: { value: diastolic, unit: 'mmHg' },
      },
    ],
  };
}

function readings(...observations: Identified<Observation>[]): TrendReading[] {
  return observations.flatMap((o) => {
    const reading = toTrendReading(o);
    return reading ? [reading] : [];
  });
}

describe('toTrendReading', () => {
  it('maps a valueQuantity observation with its flag', () => {
    const reading = toTrendReading(
      quantity('o1', '4548-4', 'Hemoglobin A1c', '2024-01-01', 7.4, '%', 'H'),
    );
    expect(reading).toEqual({
      code: '4548-4',
      title: 'Hemoglobin A1c',
      unit: '%',
      point: {
        id: 'Observation/o1',
        date: '2024-01-01',
        value: 7.4,
        secondaryValue: null,
        flag: ObservationFlag.HIGH,
      },
      reference: null,
      secondaryReference: null,
    });
  });

  it('reads the reference range when its unit matches', () => {
    const withRange = (unit: string): Identified<Observation> => ({
      ...quantity('o1', '4548-4', 'Hemoglobin A1c', '2024-01-01', 7.4, '%'),
      referenceRange: [{ low: { value: 4, unit }, high: { value: 5.6, unit } }],
    });
    expect(toTrendReading(withRange('%'))?.reference).toEqual({
      low: 4,
      high: 5.6,
    });
    expect(toTrendReading(withRange('mg/dL'))?.reference).toBeNull();
  });

  it('reads blood pressure ranges from the components', () => {
    const panel = bp('b1', '2024-01-09T14:35:00Z', 142, 91);
    const [systolic, diastolic] = panel.component ?? [];
    if (!systolic || !diastolic) throw new Error('fixture');
    systolic.referenceRange = [
      { low: { value: 90, unit: 'mmHg' }, high: { value: 120, unit: 'mmHg' } },
    ];
    diastolic.referenceRange = [
      { low: { value: 60, unit: 'mmHg' }, high: { value: 80, unit: 'mmHg' } },
    ];
    expect(toTrendReading(panel)).toMatchObject({
      reference: { low: 90, high: 120 },
      secondaryReference: { low: 60, high: 80 },
    });
  });

  it('maps a blood pressure panel to systolic value and diastolic secondaryValue', () => {
    const reading = toTrendReading(bp('b1', '2024-01-09T14:35:00Z', 142, 91));
    expect(reading).toMatchObject({
      code: '85354-9',
      title: 'Blood pressure',
      unit: 'mmHg',
      point: { value: 142, secondaryValue: 91, flag: null },
    });
  });

  it('maps valueInteger observations without a unit', () => {
    const reading = toTrendReading({
      resourceType: 'Observation',
      id: 'pain',
      status: 'final',
      code: {
        coding: [{ system: LOINC, code: '72514-3' }],
        text: 'Pain score',
      },
      subject,
      effectiveDateTime: '2024-05-11',
      valueInteger: 7,
    });
    expect(reading).toMatchObject({ unit: null, point: { value: 7 } });
  });

  it('returns null for undated, non-numeric, non-LOINC or incomplete panels', () => {
    expect(
      toTrendReading(quantity('u', '4548-4', 'A1c', undefined, 7, '%')),
    ).toBeNull();
    expect(
      toTrendReading({
        resourceType: 'Observation',
        id: 's',
        status: 'final',
        code: { coding: [{ system: LOINC, code: '72166-2' }] },
        subject,
        effectiveDateTime: '2024-01-01',
        valueString: 'Never smoker',
      }),
    ).toBeNull();
    expect(
      toTrendReading({
        resourceType: 'Observation',
        id: 'n',
        status: 'final',
        code: { coding: [{ system: 'http://snomed.info/sct', code: '1' }] },
        subject,
        effectiveDateTime: '2024-01-01',
        valueQuantity: { value: 1, unit: 'x' },
      }),
    ).toBeNull();
    const partial = bp('p', '2024-01-01', 120, 80);
    partial.component = partial.component?.slice(0, 1);
    expect(toTrendReading(partial)).toBeNull();
  });
});

describe('buildTrends', () => {
  it('groups by LOINC code with ascending points and "<patient>/<code>" ids', () => {
    const trends = buildTrends(
      'pat-1',
      readings(
        quantity('a2', '4548-4', 'Hemoglobin A1c', '2024-07-22', 7.1, '%'),
        quantity('a1', '4548-4', 'Hemoglobin A1c', '2023-03-14', 7.8, '%'),
        quantity('w1', '29463-7', 'Body weight', '2023-03-14', 90, 'kg'),
        quantity('w2', '29463-7', 'Body weight', '2023-09-14', 88, 'kg'),
      ),
    );
    expect(trends.map((t) => t.id)).toEqual(['pat-1/4548-4', 'pat-1/29463-7']);
    expect(trends[0]?.points.map((p) => p.id)).toEqual([
      'Observation/a1',
      'Observation/a2',
    ]);
    expect(trends[0]).toMatchObject({ code: '4548-4', unit: '%' });
  });

  it('takes the range from the latest point, null when absent', () => {
    const ranged = (
      id: string,
      date: string,
      high: number,
    ): Identified<Observation> => ({
      ...quantity(id, '4548-4', 'Hemoglobin A1c', date, 7, '%'),
      referenceRange: [{ low: { value: 4, unit: '%' }, high: { value: high } }],
    });
    const [trend] = buildTrends(
      'pat-1',
      readings(ranged('a1', '2023-01-01', 5), ranged('a2', '2024-01-01', 5.6)),
    );
    expect(trend).toMatchObject({
      referenceLow: 4,
      referenceHigh: 5.6,
      secondaryReferenceLow: null,
      secondaryReferenceHigh: null,
    });
    const [plain] = buildTrends(
      'pat-1',
      readings(
        quantity('w1', '29463-7', 'Body weight', '2023-03-14', 90, 'kg'),
        quantity('w2', '29463-7', 'Body weight', '2023-09-14', 88, 'kg'),
      ),
    );
    expect(plain?.referenceLow).toBeNull();
    expect(plain?.referenceHigh).toBeNull();
  });

  it('includes blood pressure with secondaryValue', () => {
    const [trend] = buildTrends(
      'pat-1',
      readings(
        bp('b2', '2024-07-22T10:20:00Z', 128, 82),
        bp('b1', '2024-01-09T14:35:00Z', 142, 91),
      ),
    );
    expect(trend?.unit).toBe('mmHg');
    expect(trend?.points.map((p) => [p.value, p.secondaryValue])).toEqual([
      [142, 91],
      [128, 82],
    ]);
  });

  it('omits series with fewer than two points', () => {
    expect(
      buildTrends(
        'pat-1',
        readings(quantity('a1', '4548-4', 'A1c', '2023-03-14', 7.8, '%')),
      ),
    ).toEqual([]);
  });

  it('skips points whose unit differs from the first unit, then applies the minimum', () => {
    const trends = buildTrends(
      'pat-1',
      readings(
        quantity('w1', '29463-7', 'Body weight', '2023-01-01', 90, 'kg'),
        quantity('w2', '29463-7', 'Body weight', '2023-06-01', 198, '[lb_av]'),
        quantity('w3', '29463-7', 'Body weight', '2023-09-01', 88, 'kg'),
        quantity('h1', '8302-2', 'Body height', '2023-01-01', 180, 'cm'),
        quantity('h2', '8302-2', 'Body height', '2023-06-01', 70, '[in_i]'),
      ),
    );
    expect(trends).toHaveLength(1);
    expect(trends[0]?.points.map((p) => p.id)).toEqual([
      'Observation/w1',
      'Observation/w3',
    ]);
  });

  it('orders trends by most recent point (newest first), then title', () => {
    const trends = buildTrends(
      'pat-1',
      readings(
        quantity('a1', '1-1', 'Zeta', '2023-01-01', 1, 'u'),
        quantity('a2', '1-1', 'Zeta', '2025-01-01', 2, 'u'),
        quantity('b1', '2-2', 'Beta', '2023-01-01', 1, 'u'),
        quantity('b2', '2-2', 'Beta', '2025-01-01', 2, 'u'),
        quantity('c1', '3-3', 'Gamma', '2023-01-01', 1, 'u'),
        quantity('c2', '3-3', 'Gamma', '2025-06-01', 2, 'u'),
      ),
    );
    expect(trends.map((t) => t.title)).toEqual(['Gamma', 'Beta', 'Zeta']);
  });

  it('keeps per-point flags', () => {
    const [trend] = buildTrends(
      'pat-1',
      readings(
        quantity('s1', '59408-5', 'SpO2', '2024-01-01', 86, '%', 'L'),
        quantity('s2', '59408-5', 'SpO2', '2024-02-01', 95, '%', 'N'),
      ),
    );
    expect(trend?.points.map((p) => p.flag)).toEqual([
      ObservationFlag.LOW,
      null,
    ]);
  });
});

describe('buildTrends unit text', () => {
  it('shows a readable unit but groups by the raw unit', () => {
    const reading = (id: string, date: string): TrendReading => ({
      code: '33914-3',
      title: 'eGFR',
      unit: 'mL/min/{1.73_m2}',
      point: { id, date, value: 60.7369, secondaryValue: null, flag: null },
      reference: null,
      secondaryReference: null,
    });
    const trends = buildTrends('p1', [
      reading('Observation/a', '2020-01-01'),
      reading('Observation/b', '2021-01-01'),
    ]);
    expect(trends[0]).toMatchObject({ unit: 'mL/min/1.73 m²' });
    expect(trends[0]?.points[0]?.value).toBe(60.7369);
  });
});
