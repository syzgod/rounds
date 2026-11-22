import type {
  CodeableConcept,
  Coding,
  Condition,
  Encounter,
  Observation,
  ObservationComponent,
  Quantity,
} from 'fhir/r4.js';
import {
  type ClinicalResource,
  type Identified,
  isCondition,
  isEncounter,
} from '../fhir/fhir-guards.js';
import {
  ObservationFlag,
  TimelineEventKind,
  type TimelineEventDto,
} from './dto/timeline-event.dto.js';

const LOINC_SYSTOLIC = '8480-6';
const LOINC_DIASTOLIC = '8462-4';

const ENCOUNTER_CLASS_LABELS: Record<string, string> = {
  AMB: 'Ambulatory',
  EMER: 'Emergency',
  IMP: 'Inpatient',
  ACUTE: 'Inpatient',
  HH: 'Home health',
  VR: 'Virtual',
  OBSENC: 'Observation',
};

const FLAG_BY_INTERPRETATION: Record<string, ObservationFlag> = {
  L: ObservationFlag.LOW,
  LL: ObservationFlag.LOW,
  LU: ObservationFlag.LOW,
  H: ObservationFlag.HIGH,
  HH: ObservationFlag.HIGH,
  HU: ObservationFlag.HIGH,
  A: ObservationFlag.ABNORMAL,
  AA: ObservationFlag.ABNORMAL,
};

function firstCoding(concept: CodeableConcept | undefined): Coding | undefined {
  return concept?.coding?.[0];
}

/** `CodeableConcept.text`, then the first coding's display, then its code. */
export function conceptLabel(
  concept: CodeableConcept | undefined,
): string | null {
  const text = concept?.text?.trim();
  if (text) return text;
  const coding = firstCoding(concept);
  return coding?.display?.trim() || coding?.code?.trim() || null;
}

/** Sentence case for terminology displays such as "Vital Signs" -> "Vital signs". */
function sentenceCase(value: string | null): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** "7.8 %", "52 mg/dL", "28/min" (per-unit rates attach without a space). */
export function formatQuantity(quantity: Quantity | undefined): string | null {
  if (quantity?.value === undefined) return null;
  const unit = (quantity.unit ?? quantity.code ?? '').trim();
  if (!unit) return String(quantity.value);
  return unit.startsWith('/')
    ? `${quantity.value}${unit}`
    : `${quantity.value} ${unit}`;
}

function componentCode(component: ObservationComponent): string | undefined {
  return component.code.coding?.find(
    (coding) => coding.system === 'http://loinc.org',
  )?.code;
}

/** Blood pressure as "120/80 mmHg"; other component sets as "Label: value; …". */
function formatComponents(
  components: readonly ObservationComponent[] | undefined,
): string | null {
  if (!components || components.length === 0) return null;
  const systolic = components.find((c) => componentCode(c) === LOINC_SYSTOLIC);
  const diastolic = components.find(
    (c) => componentCode(c) === LOINC_DIASTOLIC,
  );
  if (
    systolic?.valueQuantity?.value !== undefined &&
    diastolic?.valueQuantity?.value !== undefined
  ) {
    const unit = systolic.valueQuantity.unit ?? diastolic.valueQuantity.unit;
    const reading = `${systolic.valueQuantity.value}/${diastolic.valueQuantity.value}`;
    return unit ? `${reading} ${unit}` : reading;
  }
  const parts = components
    .map((component) => {
      const value = formatQuantity(component.valueQuantity);
      const label = conceptLabel(component.code);
      return value && label ? `${label}: ${value}` : value;
    })
    .filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join('; ') : null;
}

export function formatObservationValue(
  observation: Observation,
): string | null {
  if (observation.valueQuantity)
    return formatQuantity(observation.valueQuantity);
  if (observation.valueCodeableConcept)
    return conceptLabel(observation.valueCodeableConcept);
  if (observation.valueInteger !== undefined)
    return String(observation.valueInteger);
  if (observation.valueString !== undefined) return observation.valueString;
  if (observation.valueBoolean !== undefined)
    return observation.valueBoolean ? 'Yes' : 'No';
  return formatComponents(observation.component);
}

function observationFlag(observation: Observation): ObservationFlag | null {
  for (const concept of observation.interpretation ?? []) {
    for (const coding of concept.coding ?? []) {
      const flag = coding.code
        ? FLAG_BY_INTERPRETATION[coding.code]
        : undefined;
      if (flag) return flag;
    }
  }
  return null;
}

export function encounterToEvent(
  encounter: Identified<Encounter>,
): TimelineEventDto {
  const classCode = encounter.class?.code;
  return {
    id: `Encounter/${encounter.id}`,
    kind: TimelineEventKind.ENCOUNTER,
    date: encounter.period?.start ?? null,
    endDate: encounter.period?.end ?? null,
    title:
      conceptLabel(encounter.type?.[0]) ??
      sentenceCase(encounter.class?.display ?? null) ??
      'Encounter',
    detail: null,
    category:
      (classCode ? ENCOUNTER_CLASS_LABELS[classCode] : undefined) ??
      sentenceCase(encounter.class?.display ?? null),
    status: encounter.status ?? null,
    flag: null,
    rawJson: JSON.stringify(encounter),
  };
}

export function conditionToEvent(
  condition: Identified<Condition>,
): TimelineEventDto {
  return {
    id: `Condition/${condition.id}`,
    kind: TimelineEventKind.CONDITION,
    date: condition.onsetDateTime ?? condition.recordedDate ?? null,
    endDate: condition.abatementDateTime ?? null,
    title: conceptLabel(condition.code) ?? 'Condition',
    detail: null,
    category: sentenceCase(conceptLabel(condition.category?.[0])),
    status: firstCoding(condition.clinicalStatus)?.code ?? null,
    flag: null,
    rawJson: JSON.stringify(condition),
  };
}

export function observationToEvent(
  observation: Identified<Observation>,
): TimelineEventDto {
  return {
    id: `Observation/${observation.id}`,
    kind: TimelineEventKind.OBSERVATION,
    date: observation.effectiveDateTime ?? observation.issued ?? null,
    endDate: null,
    title: conceptLabel(observation.code) ?? 'Observation',
    detail: formatObservationValue(observation),
    category: sentenceCase(conceptLabel(observation.category?.[0])),
    status: observation.status,
    flag: observationFlag(observation),
    rawJson: JSON.stringify(observation),
  };
}

export function toTimelineEvent(resource: ClinicalResource): TimelineEventDto {
  if (isEncounter(resource)) return encounterToEvent(resource);
  if (isCondition(resource)) return conditionToEvent(resource);
  return observationToEvent(resource);
}

const KIND_ORDER: Record<TimelineEventKind, number> = {
  [TimelineEventKind.ENCOUNTER]: 0,
  [TimelineEventKind.CONDITION]: 1,
  [TimelineEventKind.OBSERVATION]: 2,
};

/** Milliseconds for FHIR date/dateTime values, including partial dates ("2016-04"). */
function timeOf(date: string | null): number | null {
  if (!date) return null;
  const ms = Date.parse(date);
  return Number.isNaN(ms) ? null : ms;
}

/** Newest first; undated events last; ties broken by kind, then id (stable output). */
export function compareTimelineEvents(
  a: TimelineEventDto,
  b: TimelineEventDto,
): number {
  const ta = timeOf(a.date);
  const tb = timeOf(b.date);
  if (ta !== tb) {
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  }
  return (
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id, 'en')
  );
}
