import { displayNumber, displayUnit } from './display-value.js';
import { formatObservationValue } from './timeline.mapper.js';
import type { Observation } from 'fhir/r4.js';

describe('displayNumber', () => {
  it.each([
    [117.01685768343414, '117.02'],
    [60.736930240840444, '60.74'],
    [52, '52'],
    [6.6, '6.6'],
    [7.8, '7.8'],
    [1.2125926248338859, '1.21'],
  ])('rounds %s to %s', (value, expected) => {
    expect(displayNumber(value)).toBe(expected);
  });
});

describe('displayUnit', () => {
  it.each([
    ['mm[Hg]', 'mmHg'],
    ['mL/min/{1.73_m2}', 'mL/min/1.73 m²'],
    ['kg/m2', 'kg/m²'],
    ['Cel', '°C'],
    ['[degF]', '°F'],
    ['10*3/uL', '10³/µL'],
    ['10*6/uL', '10⁶/µL'],
    ['/min', '/min'],
    ['%', '%'],
    ['{score}', null],
    ['[IU]/L', 'IU/L'],
    ['mg/dL', 'mg/dL'],
    ['  ', null],
    [undefined, null],
  ])('maps %s to %s', (unit, expected) => {
    expect(displayUnit(unit)).toBe(expected);
  });
});

describe('formatObservationValue with raw Synthea values', () => {
  const base = {
    resourceType: 'Observation',
    status: 'final',
    code: { text: 'x' },
  } as const;

  it('rounds single values and cleans units', () => {
    const o: Observation = {
      ...base,
      valueQuantity: { value: 60.736930240840444, unit: 'mL/min/{1.73_m2}' },
    };
    expect(formatObservationValue(o)).toBe('60.74 mL/min/1.73 m²');
  });

  it('drops annotation-only units', () => {
    const o: Observation = {
      ...base,
      valueQuantity: { value: 1.2125926248338859, unit: '{score}' },
    };
    expect(formatObservationValue(o)).toBe('1.21');
  });

  it('rounds both blood pressure readings', () => {
    const o: Observation = {
      ...base,
      component: [
        {
          code: { coding: [{ system: 'http://loinc.org', code: '8480-6' }] },
          valueQuantity: { value: 169.9580227364752, unit: 'mm[Hg]' },
        },
        {
          code: { coding: [{ system: 'http://loinc.org', code: '8462-4' }] },
          valueQuantity: { value: 98.37543074060981, unit: 'mm[Hg]' },
        },
      ],
    };
    expect(formatObservationValue(o)).toBe('169.96/98.38 mmHg');
  });
});
