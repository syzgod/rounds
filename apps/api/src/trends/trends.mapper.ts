import type {
  Observation,
  ObservationComponent,
  Quantity,
  Range,
} from 'fhir/r4.js';
import type { Identified } from '../fhir/fhir-guards.js';
import {
  conceptLabel,
  loincCode,
  observationFlag,
} from '../timeline/timeline.mapper.js';
import { displayUnit } from '../timeline/display-value.js';
import type { TrendDto, TrendPointDto } from './dto/trend.dto.js';

const LOINC_SYSTOLIC = '8480-6';
const LOINC_DIASTOLIC = '8462-4';
const BLOOD_PRESSURE_UNIT = 'mmHg';

/** Lower and upper bound of a normal range, either of which may be open. */
export interface ReferenceBounds {
  low: number | null;
  high: number | null;
}

/** A numeric reading extracted from one Observation, before grouping. */
export interface TrendReading {
  code: string;
  title: string;
  unit: string | null;
  point: TrendPointDto;
  reference: ReferenceBounds | null;
  secondaryReference: ReferenceBounds | null;
}

function quantityValue(
  quantity: Quantity | undefined,
  unit: string | null,
): number | null {
  const value = quantity?.value;
  if (value === undefined || !Number.isFinite(value)) return null;
  const quantityUnit = quantity?.unit?.trim() || quantity?.code?.trim();
  if (quantityUnit && unit !== null && quantityUnit !== unit) {
    // Also accept the UCUM code when the display unit differs.
    if (quantity?.code?.trim() !== unit) return null;
  }
  return value;
}

/**
 * The first reference range as bounds; null when absent, empty, or when its
 * unit differs from the series unit.
 */
function referenceBounds(
  ranges: readonly Range[] | undefined,
  unit: string | null,
): ReferenceBounds | null {
  const range = ranges?.[0];
  if (!range) return null;
  const low = quantityValue(range.low, unit);
  const high = quantityValue(range.high, unit);
  if (low === null && high === null) return null;
  return { low, high };
}

function findComponent(
  components: readonly ObservationComponent[] | undefined,
  code: string,
): ObservationComponent | undefined {
  return components?.find((c) => loincCode(c.code) === code);
}

function componentValue(
  components: readonly ObservationComponent[] | undefined,
  code: string,
): number | undefined {
  return findComponent(components, code)?.valueQuantity?.value;
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
  let reference: ReferenceBounds | null = null;
  let secondaryReference: ReferenceBounds | null = null;

  const systolic = componentValue(observation.component, LOINC_SYSTOLIC);
  const diastolic = componentValue(observation.component, LOINC_DIASTOLIC);
  if (systolic !== undefined && diastolic !== undefined) {
    value = systolic;
    secondaryValue = diastolic;
    unit = BLOOD_PRESSURE_UNIT;
    reference = referenceBounds(
      findComponent(observation.component, LOINC_SYSTOLIC)?.referenceRange,
      unit,
    );
    secondaryReference = referenceBounds(
      findComponent(observation.component, LOINC_DIASTOLIC)?.referenceRange,
      unit,
    );
  } else if (observation.valueQuantity?.value !== undefined) {
    value = observation.valueQuantity.value;
    unit =
      observation.valueQuantity.unit?.trim() ||
      observation.valueQuantity.code?.trim() ||
      null;
    reference = referenceBounds(observation.referenceRange, unit);
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
    reference,
    secondaryReference,
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
    { first: TrendReading; readings: TrendReading[] }
  >();
  for (const reading of ordered) {
    const group = groups.get(reading.code);
    if (!group) {
      groups.set(reading.code, { first: reading, readings: [reading] });
    } else if (reading.unit === group.first.unit) {
      group.readings.push(reading);
    }
  }

  const trends: TrendDto[] = [];
  for (const { first, readings: series } of groups.values()) {
    if (series.length < 2) continue;
    const latest = series[series.length - 1];
    const points = series.map((r) => r.point);
    trends.push({
      id: `${patientId}/${first.code}`,
      code: first.code,
      title: first.title,
      unit: displayUnit(first.unit ?? undefined),
      referenceLow: latest?.reference?.low ?? null,
      referenceHigh: latest?.reference?.high ?? null,
      secondaryReferenceLow: latest?.secondaryReference?.low ?? null,
      secondaryReferenceHigh: latest?.secondaryReference?.high ?? null,
      points,
    });
  }
  const latestTime = (trend: TrendDto): number =>
    timeOf(trend.points[trend.points.length - 1]?.date ?? '');
  return trends.sort(
    (a, b) =>
      latestTime(b) - latestTime(a) || a.title.localeCompare(b.title, 'en'),
  );
}
