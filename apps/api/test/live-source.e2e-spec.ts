import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { FhirResource, Reference } from 'fhir/r4.js';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { FhirSource } from '../src/fhir/fhir-source.js';
import { LiveFhirService } from '../src/fhir/live-fhir.service.js';
import { AppModule } from './../src/app.module.js';

const PATIENT = {
  resourceType: 'Patient' as const,
  id: 'p1',
  name: [{ given: ['Juan'], family: 'Stracke' }],
};
const HEART_RATE = {
  resourceType: 'Observation' as const,
  id: 'o1',
  status: 'final' as const,
  code: { coding: [{ system: 'http://loinc.org', code: '8867-4' }] },
  subject: { reference: 'Patient/p1' },
  effectiveDateTime: '2024-01-01T10:00:00Z',
  valueQuantity: { value: 72, unit: '/min' },
};

/** Stands in for the live server, so CI never needs the network. */
const fakeLive: FhirSource = {
  getPatients: () => Promise.resolve([PATIENT]),
  getPatient: (id) => Promise.resolve(id === 'p1' ? PATIENT : null),
  getClinicalResources: (id) =>
    Promise.resolve(id === 'p1' ? [HEART_RATE] : []),
  resolve: (reference: Reference | undefined) => {
    const all: (FhirResource & { id: string })[] = [PATIENT, HEART_RATE];
    return Promise.resolve(
      all.find((r) => `${r.resourceType}/${r.id}` === reference?.reference) ??
        null,
    );
  },
};

describe('Live FHIR source GraphQL (e2e)', () => {
  let app: INestApplication<App>;

  const gql = async (query: string) =>
    (
      await request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200)
    ).body as {
      data: Record<string, unknown> | null;
      errors?: { message: string }[];
    };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LiveFhirService)
      .useValue(fakeLive)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists live patients with "live-" ids, separate from the demo patients', async () => {
    const live = await gql(`{ patients(source: LIVE) { id displayName } }`);
    expect(live.data?.patients).toEqual([
      { id: 'live-p1', displayName: 'Juan Stracke' },
    ]);
    const local = await gql(`{ patients { id } }`);
    expect(local.data?.patients).toHaveLength(6);
  });

  it('scopes every nested id, keeps rawJson original and stays read-only', async () => {
    const res = await gql(`{ patient(id: "live-p1") {
      id abnormalResultCount
      timeline { id needsAcknowledgement rawJson }
      trends { id }
    } }`);
    expect(res.errors).toBeUndefined();
    expect(res.data?.patient).toEqual({
      id: 'live-p1',
      abnormalResultCount: 0,
      timeline: [
        {
          id: 'live-Observation/o1',
          needsAcknowledgement: false,
          rawJson: JSON.stringify(HEART_RATE),
        },
      ],
      trends: [],
    });

    const event = await gql(
      `{ timelineEvent(id: "live-Observation/o1") { id title } }`,
    );
    expect(event.data?.timelineEvent).toEqual({
      id: 'live-Observation/o1',
      title: '8867-4',
    });

    const ack = await gql(
      `mutation { acknowledgeResult(id: "live-Observation/o1", initials: "VB") { id } }`,
    );
    expect(ack.errors?.[0]?.message).toBe('Live data is read-only.');
  });
});
