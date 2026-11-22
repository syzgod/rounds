import { registerEnumType } from '@nestjs/graphql';

/** Where patient data comes from. */
export enum DataSource {
  /** The hand-written bundles in data/fhir/. */
  LOCAL = 'LOCAL',
  /** A public FHIR R4 test server, read-only. */
  LIVE = 'LIVE',
}

registerEnumType(DataSource, {
  name: 'DataSource',
  description:
    'LOCAL: the demo bundles. LIVE: a public FHIR R4 test server (read-only).',
});

/**
 * Prefix for every id that comes from the live server. "live-<id>" is still a
 * valid FHIR id, and the Apollo cache never mixes the two sources.
 */
const LIVE_PREFIX = 'live-';

export function sourceOf(id: string): DataSource {
  return id.startsWith(LIVE_PREFIX) ? DataSource.LIVE : DataSource.LOCAL;
}

/** The id as the source knows it ("live-Observation/1" → "Observation/1"). */
export function stripSource(id: string): string {
  return id.startsWith(LIVE_PREFIX) ? id.slice(LIVE_PREFIX.length) : id;
}

export function withSource(id: string, source: DataSource): string {
  return source === DataSource.LIVE ? `${LIVE_PREFIX}${id}` : id;
}
