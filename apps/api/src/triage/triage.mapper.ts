import type { CodeableConcept, Condition, Observation } from 'fhir/r4.js';
import type { Identified } from '../fhir/fhir-guards.js';
import { conceptLabel, observationFlag } from '../timeline/timeline.mapper.js';

const LOINC = 'http://loinc.org';
const ACTIVE_STATUS_CODES: ReadonlySet<string> = new Set([
  'active',
  'recurrence',
  'relapse',
]);

function timeOf(date: string | undefined): number | null {
  if (!date) return null;
  const ms = Date.parse(date);
  return Number.isNaN(ms) ? null : ms;
}

function isActiveCondition(condition: Condition): boolean {
  return (
    condition.clinicalStatus?.coding?.some(
      (c) => c.code !== undefined && ACTIVE_STATUS_CODES.has(c.code),
    ) ?? false
  );
}

/**
 * Labels of active, recurring or relapsed Conditions, newest onset (or
 * recorded) date first, undated last, de-duplicated by label.
 */
export function activeDiagnosisLabels(
  conditions: readonly Identified<Condition>[],
): string[] {
  const entries: { label: string; time: number | null; id: string }[] = [];
  for (const condition of conditions) {
    if (!isActiveCondition(condition)) continue;
    const label = conceptLabel(condition.code);
    if (!label) continue;
    entries.push({
      label,
      time: timeOf(condition.onsetDateTime ?? condition.recordedDate),
      id: condition.id,
    });
  }
  entries.sort((a, b) => {
    if (a.time === null && b.time !== null) return 1;
    if (a.time !== null && b.time === null) return -1;
    return (b.time ?? 0) - (a.time ?? 0) || a.id.localeCompare(b.id, 'en');
  });
  const labels = new Set<string>();
  for (const entry of entries) labels.add(entry.label);
  return [...labels];
}

function measurementCode(concept: CodeableConcept | undefined): string | null {
  const loinc = concept?.coding?.find((c) => c.system === LOINC && c.code);
  return loinc?.code ?? concept?.coding?.find((c) => c.code)?.code ?? null;
}

/**
 * Number of distinct observation codes whose latest dated Observation is
 * flagged high, low or abnormal and not acknowledged. Undated Observations
 * are ignored.
 */
export function abnormalResultCount(
  observations: readonly Identified<Observation>[],
  isAcknowledged: (eventId: string) => boolean = () => false,
): number {
  const latest = new Map<
    string,
    { time: number; flagged: boolean; id: string }
  >();
  for (const observation of observations) {
    const code = measurementCode(observation.code);
    const time = timeOf(observation.effectiveDateTime);
    if (code === null || time === null) continue;
    const current = latest.get(code);
    if (
      !current ||
      time > current.time ||
      (time === current.time &&
        observation.id.localeCompare(current.id, 'en') > 0)
    ) {
      latest.set(code, {
        time,
        flagged:
          observationFlag(observation) !== null &&
          !isAcknowledged(`Observation/${observation.id}`),
        id: observation.id,
      });
    }
  }
  let count = 0;
  for (const { flagged } of latest.values()) if (flagged) count += 1;
  return count;
}
