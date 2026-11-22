import type {
  CodeableConcept,
  Observation,
  ObservationComponent,
} from 'fhir/r4.js';
import type { Identified } from '../fhir/fhir-guards.js';
import { conceptLabel, observationFlag } from '../timeline/timeline.mapper.js';
import type { TrendDto, TrendPointDto } from './dto/trend.dto.js';

const LOINC = 'http://loinc.org';
const LOINC_SYSTOLIC = '8480-6';
const LOINC_DIASTOLIC = '8462-4';
const BLOOD_PRESSURE_UNIT = 'mmHg';

/** A numeric reading extracted from one Observation, before grouping. */
export interface TrendReading {
  code: string;
  title: string;
  unit: string | null;
  point: TrendPointDto;
}

function loincCode(concept: CodeableConcept | undefined): string | undefined {
  return concept?.coding?.find((c) => c.system === LOINC && c.code)?.code;
}

function componentValue(
  components: readonly ObservationComponent[] | undefined,
  code: string,
): number | undefined {
  return components?.find((c) => loincCode(c.code) === code)?.valueQuantity
    ?.value;
}

/**
 * Reduces a numeric Observation (valueQuantity, valueInteger or a blood
 * pressure panel) to a reading; null for anything else or when undated.
 */
export function toTrendReading(
  observation: Identified<Observation>,
): TrendReading | null {
  const code = loincCode(observation.code);
  const date = observation.effectiveDateTime;
  if (!code || !date) return null;

  let value: number | undefined;
  let secondaryValue: number | null = null;
  let unit: string | null = null;

  const systolic = componentValue(observation.component, LOINC_SYSTOLIC);
  const diastolic = componentValue(observation.component, LOINC_DIASTOLIC);
  if (systolic !== undefined && diastolic !== undefined) {
    value = systolic;
    secondaryValue = diastolic;
    unit = BLOOD_PRESSURE_UNIT;
  } else if (observation.valueQuantity?.value !== undefined) {
    value = observation.valueQuantity.value;
    unit =
      observation.valueQuantity.unit?.trim() ||
      observation.valueQuantity.code?.trim() ||
      null;
  } else if (observation.valueInteger !== undefined) {
    value = observation.valueInteger;
  }
  if (value === undefined || !Number.isFinite(value)) return null;

  return {
    code,
    title: conceptLabel(observation.code) ?? code,
    unit,
    point: {
      id: `Observation/${observation.id}`,
      date,
      value,
      secondaryValue,
      flag: observationFlag(observation),
    },
  };
}

function timeOf(date: string): number {
  const ms = Date.parse(date);
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Groups readings by LOINC code into series. Points whose unit differs from
 * the series' first unit are dropped; series with fewer than two points are
 * omitted. Points run oldest to newest; series by latest point (newest
 * first), then title.
 */
export function buildTrends(
  patientId: string,
  readings: readonly TrendReading[],
): TrendDto[] {
  const ordered = [...readings].sort(
    (a, b) =>
      timeOf(a.point.date) - timeOf(b.point.date) ||
      a.point.id.localeCompare(b.point.id, 'en'),
  );
  const groups = new Map<
    string,
    { first: TrendReading; points: TrendPointDto[] }
  >();
  for (const reading of ordered) {
    const group = groups.get(reading.code);
    if (!group) {
      groups.set(reading.code, { first: reading, points: [reading.point] });
    } else if (reading.unit === group.first.unit) {
      group.points.push(reading.point);
    }
  }

  const trends: TrendDto[] = [];
  for (const { first, points } of groups.values()) {
    if (points.length < 2) continue;
    trends.push({
      id: `${patientId}/${first.code}`,
      code: first.code,
      title: first.title,
      unit: first.unit,
      points,
    });
  }
  const latest = (trend: TrendDto): number =>
    timeOf(trend.points[trend.points.length - 1]?.date ?? '');
  return trends.sort(
    (a, b) => latest(b) - latest(a) || a.title.localeCompare(b.title, 'en'),
  );
}
