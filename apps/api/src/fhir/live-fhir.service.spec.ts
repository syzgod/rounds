import { ServiceUnavailableException } from '@nestjs/common';
import { LiveFhirService } from './live-fhir.service.js';

const BASE = 'https://fhir.example.test';
const PATIENT = { resourceType: 'Patient', id: 'p1' };
const OBSERVATION = {
  resourceType: 'Observation',
  id: 'o1',
  status: 'final',
  code: { text: 'Heart rate' },
  subject: { reference: 'Patient/p1' },
};

function bundle(...resources: object[]): Response {
  return Response.json({
    resourceType: 'Bundle',
    type: 'searchset',
    entry: resources.map((resource) => ({ resource })),
  });
}

describe('LiveFhirService', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;
  let service: LiveFhirService;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
    service = new LiveFhirService(BASE, ['p1']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('loads only the configured patients, in one search', async () => {
    fetchMock.mockResolvedValueOnce(bundle(PATIENT, OBSERVATION));

    expect(await service.getPatients()).toEqual([PATIENT]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `${BASE}/Patient?_id=p1&_count=1`,
    );
  });

  it('returns clinical resources and skips other types and other patients', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(bundle(OBSERVATION, PATIENT)),
    );

    const resources = await service.getClinicalResources('p1');
    expect(resources.map((r) => r.resourceType)).toEqual([
      'Observation',
      'Observation',
      'Observation',
    ]);
    expect(await service.getClinicalResources('not-configured')).toEqual([]);
  });

  it('caches responses for 10 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    fetchMock.mockImplementation(() => Promise.resolve(bundle(PATIENT)));

    await service.getPatients();
    await service.getPatients();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    await service.getPatients();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares one request between parallel callers', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(bundle(PATIENT)));

    await Promise.all([service.getPatients(), service.getPatients()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports an unreachable or failing server as unavailable, without caching it', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(service.getPatients()).rejects.toThrow(
      ServiceUnavailableException,
    );

    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(service.getPatients()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('resolves Type/id references, and null for 404 or other forms', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(PATIENT));
    expect(await service.resolve({ reference: 'Patient/p1' })).toEqual(PATIENT);

    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    expect(await service.resolve({ reference: 'Patient/gone' })).toBeNull();

    expect(await service.resolve({ reference: 'urn:uuid:1' })).toBeNull();
    expect(await service.resolve(undefined)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
