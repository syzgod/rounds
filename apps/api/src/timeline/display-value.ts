/** Common UCUM codes with a readable form. */
const UNIT_LABELS: Record<string, string> = {
  'mm[Hg]': 'mmHg',
  'mL/min/{1.73_m2}': 'mL/min/1.73 m²',
  'kg/m2': 'kg/m²',
  'm2': 'm²',
  Cel: '°C',
  '[degF]': '°F',
  '10*3/uL': '10³/µL',
  '10*6/uL': '10⁶/µL',
};

/**
 * A UCUM unit code as readable text; null when nothing is left to show.
 * Unknown codes lose `{annotations}` and square brackets.
 */
export function displayUnit(unit: string | undefined): string | null {
  const raw = unit?.trim();
  if (!raw) return null;
  const known = UNIT_LABELS[raw];
  if (known) return known;
  const cleaned = raw
    .replace(/\{[^}]*\}/g, '')
    .replace(/[[\]]/g, '')
    .trim();
  return cleaned || null;
}

/** At most 2 decimals, no trailing zeros: 117.0168 -> "117.02", 7.80 -> "7.8". */
export function displayNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return String(Number(value.toFixed(2)));
}
