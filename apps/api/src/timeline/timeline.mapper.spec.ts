import type { Condition, Encounter, Observation } from 'fhir/r4.js';
import type { Identified } from '../fhir/fhir-guards.js';
import {
  ObservationFlag,
  TimelineEventKind,
  type TimelineEventDto,
} from './dto/timeline-event.dto.js';
import {
  compareTimelineEvents,
  conditionToEvent,
  encounterToEvent,
  formatObservationValue,
  formatQuantity,
  observationToEvent,
  toTimelineEvent,
} from './timeline.mapper.js';

const LOINC = 'http://loinc.org';
const UCUM = 'http://unitsofmeasure.org';
const subject = { reference: 'Patient/pat-1' };

function bp(systolic: number, diastolic: number): Identified<Observation> {
  return {
    resourceType: 'Observation',
    id: 'obs-bp',
    status: 'final',
    code: {
      coding: [{ system: LOINC, code: '85354-9' }],
      text: 'Blood pressure',
    },
    subject,
    effectiveDateTime: '2024-01-09T14:35:00Z',
    component: [
      {
        code: { coding: [{ system: LOINC, code: '8480-6' }] },
        valueQuantity: {
          value: systolic,
          unit: 'mmHg',
          system: UCUM,
          code: 'mm[Hg]',
        },
      },
      {
        code: { coding: [{ system: LOINC, code: '8462-4' }] },
        valueQuantity: {
          value: diastolic,
          unit: 'mmHg',
          system: UCUM,
          code: 'mm[Hg]',
        },
      },
    ],
  };
}

describe('encounterToEvent', () => {
  it('maps type text, class label, period and status', () => {
    const encounter: Identified<Encounter> = {
      resourceType: 'Encounter',
      id: 'enc-1',
      status: 'finished',
      class: { code: 'EMER', display: 'emergency' },
      type: [{ text: 'Emergency visit' }],
      subject,
      period: { start: '2025-02-03T21:10:00Z', end: '2025-02-04T01:30:00Z' },
    };

    expect(encounterToEvent(encounter)).toEqual({
      id: 'Encounter/enc-1',
      kind: TimelineEventKind.ENCOUNTER,
      date: '2025-02-03T21:10:00Z',
      endDate: '2025-02-04T01:30:00Z',
      title: 'Emergency visit',
      detail: null,
      category: 'Emergency',
      code: null,
      categoryCode: 'EMER',
      status: 'finished',
      flag: null,
      rawJson: JSON.stringify(encounter),
    });
  });

  it('falls back to the class display, then a generic title, with null dates', () => {
    const minimal: Identified<Encounter> = {
      resourceType: 'Encounter',
      id: 'enc-2',
      status: 'unknown',
      class: { code: 'XYZ', display: 'HOME VISIT' },
    };
    const event = encounterToEvent(minimal);
    expect(event.title).toBe('Home visit');
    expect(event.category).toBe('Home visit');
    expect(event.date).toBeNull();
    expect(event.endDate).toBeNull();

    // Malformed: `class` is required by R4 but absent in the wild.
    const malformed = {
      resourceType: 'Encounter',
      id: 'enc-3',
      status: 'finished',
    } as const;
    expect(encounterToEvent(malformed as Identified<Encounter>)).toMatchObject({
      title: 'Encounter',
      category: null,
    });
  });
});

describe('conditionToEvent', () => {
  it('uses onset, abatement and clinical status', () => {
    const condition: Identified<Condition> = {
      resourceType: 'Condition',
      id: 'cond-1',
      clinicalStatus: { coding: [{ code: 'resolved' }] },
      category: [
        {
          coding: [
            { code: 'encounter-diagnosis', display: 'Encounter Diagnosis' },
          ],
        },
      ],
      code: {
        coding: [{ display: 'Hypoglycemia (disorder)' }],
        text: 'Hypoglycemia',
      },
      subject,
      onsetDateTime: '2025-02-03T21:10:00Z',
      abatementDateTime: '2025-02-04T01:30:00Z',
      recordedDate: '2025-02-03',
    };

    expect(conditionToEvent(condition)).toMatchObject({
      id: 'Condition/cond-1',
      date: '2025-02-03T21:10:00Z',
      endDate: '2025-02-04T01:30:00Z',
      title: 'Hypoglycemia',
      category: 'Encounter diagnosis',
      categoryCode: 'encounter-diagnosis',
      code: null,
      status: 'resolved',
    });
  });

  it('falls back to recordedDate, then to coding display, then to a generic title', () => {
    const recordedOnly: Identified<Condition> = {
      resourceType: 'Condition',
      id: 'cond-2',
      code: {
        coding: [
          { code: '59621000', display: 'Essential hypertension (disorder)' },
        ],
      },
      subject,
      recordedDate: '2024-01-09',
    };
    expect(conditionToEvent(recordedOnly)).toMatchObject({
      date: '2024-01-09',
      title: 'Essential hypertension (disorder)',
      status: null,
      category: null,
    });

    const noCode: Identified<Condition> = {
      resourceType: 'Condition',
      id: 'cond-3',
      subject,
    };
    expect(conditionToEvent(noCode)).toMatchObject({
      title: 'Condition',
      date: null,
    });
  });
});

describe('observationToEvent', () => {
  it('formats blood pressure components as "120/80 mmHg"', () => {
    expect(observationToEvent(bp(120, 80)).detail).toBe('120/80 mmHg');
  });

  it('uses the diastolic unit, or none, when the systolic has no unit', () => {
    const reading = bp(120, 80);
    const [systolic, diastolic] = reading.component ?? [];
    if (!systolic?.valueQuantity || !diastolic?.valueQuantity) {
      throw new Error('bp() must return two quantity components');
    }
    const withoutSystolicUnit = {
      ...reading,
      component: [{ ...systolic, valueQuantity: { value: 120 } }, diastolic],
    };
    expect(formatObservationValue(withoutSystolicUnit)).toBe('120/80 mmHg');
    const withoutUnits = {
      ...reading,
      component: [
        { ...systolic, valueQuantity: { value: 120 } },
        { ...diastolic, valueQuantity: { value: 80 } },
      ],
    };
    expect(formatObservationValue(withoutUnits)).toBe('120/80');
  });

  it('maps quantity, category and a Low interpretation flag', () => {
    const glucose: Identified<Observation> = {
      resourceType: 'Observation',
      id: 'obs-glucose',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory', display: 'Laboratory' }] }],
      code: {
        text: 'Blood glucose',
        coding: [{ system: LOINC, code: '2339-0' }],
      },
      subject,
      effectiveDateTime: '2025-02-03T21:25:00Z',
      valueQuantity: { value: 52, unit: 'mg/dL' },
      interpretation: [{ coding: [{ code: 'L', display: 'Low' }] }],
    };

    expect(observationToEvent(glucose)).toEqual({
      id: 'Observation/obs-glucose',
      kind: TimelineEventKind.OBSERVATION,
      date: '2025-02-03T21:25:00Z',
      endDate: null,
      title: 'Blood glucose',
      detail: '52 mg/dL',
      category: 'Laboratory',
      code: '2339-0',
      categoryCode: 'laboratory',
      status: 'final',
      flag: ObservationFlag.LOW,
      rawJson: JSON.stringify(glucose),
    });
  });

  it('falls back to issued when there is no effective time', () => {
    const issuedOnly: Identified<Observation> = {
      resourceType: 'Observation',
      id: 'obs-smoking',
      status: 'final',
      code: { text: 'Tobacco smoking status' },
      issued: '2023-03-14T09:40:00Z',
      valueCodeableConcept: { text: 'Never smoker' },
    };
    expect(observationToEvent(issuedOnly)).toMatchObject({
      date: '2023-03-14T09:40:00Z',
      detail: 'Never smoker',
      flag: null,
    });
  });

  it('formats integer, string, boolean, rate units and missing values', () => {
    const base: Identified<Observation> = {
      resourceType: 'Observation',
      id: 'obs-x',
      status: 'final',
      code: {},
    };
    expect(formatObservationValue({ ...base, valueInteger: 7 })).toBe('7');
    expect(formatObservationValue({ ...base, valueString: 'Trace' })).toBe(
      'Trace',
    );
    expect(formatObservationValue({ ...base, valueBoolean: false })).toBe('No');
    expect(formatObservationValue({ ...base, valueBoolean: true })).toBe('Yes');
    expect(formatQuantity({ value: 28, unit: '/min' })).toBe('28/min');
    expect(formatQuantity({ value: 3 })).toBe('3');
    expect(formatQuantity({ unit: 'kg' })).toBeNull();
    expect(observationToEvent(base)).toMatchObject({
      title: 'Observation',
      detail: null,
      date: null,
    });
  });

  it('lists other components as "label: value", skipping empty ones', () => {
    const observation: Identified<Observation> = {
      resourceType: 'Observation',
      id: 'obs-pupils',
      status: 'final',
      code: { text: 'Pupil size' },
      component: [
        { code: { text: 'Left' }, valueQuantity: { value: 4, unit: 'mm' } },
        { code: {}, valueQuantity: { value: 5, unit: 'mm' } },
        { code: { text: 'No value' } },
      ],
    };
    expect(formatObservationValue(observation)).toBe('Left: 4 mm; 5 mm');
    expect(
      formatObservationValue({
        ...observation,
        component: [{ code: { text: 'No value' } }],
      }),
    ).toBeNull();
  });
});

describe('toTimelineEvent', () => {
  it('maps each clinical resource type to its kind', () => {
    const encounter: Identified<Encounter> = {
      resourceType: 'Encounter',
      id: 'enc-1',
      status: 'finished',
      class: { code: 'AMB' },
      subject,
    };
    const condition: Identified<Condition> = {
      resourceType: 'Condition',
      id: 'cond-1',
      subject,
    };
    expect(toTimelineEvent(encounter).kind).toBe(TimelineEventKind.ENCOUNTER);
    expect(toTimelineEvent(condition).kind).toBe(TimelineEventKind.CONDITION);
    expect(toTimelineEvent(bp(120, 80)).kind).toBe(
      TimelineEventKind.OBSERVATION,
    );
  });
});

describe('compareTimelineEvents', () => {
  const event = (
    id: string,
    date: string | null,
    kind = TimelineEventKind.OBSERVATION,
  ): TimelineEventDto => ({
    id,
    kind,
    date,
    endDate: null,
    title: id,
    detail: null,
    category: null,
    code: null,
    categoryCode: null,
    status: null,
    flag: null,
    rawJson: null,
  });

  it('sorts newest first, partial dates included, with undated events last', () => {
    const sorted = [
      event('undated', null),
      event('2016-04', '2016-04'),
      event('2024-07-22', '2024-07-22T10:20:00Z'),
      event('garbage', 'not-a-date'),
      event('2025', '2025-02-03T21:25:00Z'),
    ].sort(compareTimelineEvents);

    expect(sorted.map((e) => e.id)).toEqual([
      '2025',
      '2024-07-22',
      '2016-04',
      'garbage',
      'undated',
    ]);
  });

  it('breaks same-time ties by kind (encounter, condition, observation), then id', () => {
    const at = '2025-02-03T21:10:00Z';
    const sorted = [
      event('Observation/b', at, TimelineEventKind.OBSERVATION),
      event('Condition/a', at, TimelineEventKind.CONDITION),
      event('Observation/a', at, TimelineEventKind.OBSERVATION),
      event('Encounter/a', at, TimelineEventKind.ENCOUNTER),
    ].sort(compareTimelineEvents);

    expect(sorted.map((e) => e.id)).toEqual([
      'Encounter/a',
      'Condition/a',
      'Observation/a',
      'Observation/b',
    ]);
  });
});

describe('rawJson', () => {
  it('carries the original Condition resource as JSON', () => {
    const condition: Identified<Condition> = {
      resourceType: 'Condition',
      id: 'cond-raw',
      subject: { reference: 'Patient/pat-1' },
      code: { text: 'Hypertension' },
    };
    expect(JSON.parse(conditionToEvent(condition).rawJson ?? '')).toEqual(
      condition,
    );
  });
});
