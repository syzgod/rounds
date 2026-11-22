import type { Condition, Encounter, Observation } from 'fhir/r4.js';
import {
  type Identified,
  isBundle,
  isClinicalResource,
  isIdentifiedResource,
} from './fhir-guards.js';

describe('isIdentifiedResource', () => {
  it('accepts an object with a resourceType and a non-empty id', () => {
    expect(isIdentifiedResource({ resourceType: 'Patient', id: 'p1' })).toBe(
      true,
    );
  });

  it.each([
    ['null', null],
    ['an array', [{ resourceType: 'Patient', id: 'p1' }]],
    ['an empty id', { resourceType: 'Patient', id: '' }],
    ['a numeric id', { resourceType: 'Patient', id: 1 }],
    ['no resourceType', { id: 'p1' }],
  ])('rejects %s', (_label, value) => {
    expect(isIdentifiedResource(value)).toBe(false);
  });
});

describe('isBundle', () => {
  it('accepts a Bundle with or without entries', () => {
    expect(isBundle({ resourceType: 'Bundle', type: 'collection' })).toBe(true);
    expect(isBundle({ resourceType: 'Bundle', entry: [] })).toBe(true);
  });

  it('rejects other resources and a non-array entry', () => {
    expect(isBundle({ resourceType: 'Patient' })).toBe(false);
    expect(isBundle({ resourceType: 'Bundle', entry: {} })).toBe(false);
  });
});

describe('isClinicalResource', () => {
  const encounter: Identified<Encounter> = {
    resourceType: 'Encounter',
    id: 'e1',
    status: 'finished',
    class: { code: 'AMB' },
  };
  const condition: Identified<Condition> = {
    resourceType: 'Condition',
    id: 'c1',
    subject: { reference: 'Patient/p1' },
  };
  const observation: Identified<Observation> = {
    resourceType: 'Observation',
    id: 'o1',
    status: 'final',
    code: { text: 'Body weight' },
  };

  it.each([encounter, condition, observation])(
    'accepts $resourceType',
    (resource) => {
      expect(isClinicalResource(resource)).toBe(true);
    },
  );

  it('rejects other resource types', () => {
    expect(isClinicalResource({ resourceType: 'Patient', id: 'p1' })).toBe(
      false,
    );
  });
});
