import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

const FIXTURE = join(
  import.meta.dirname,
  '../../../data/fhir/pat-amelia-hartwell.json',
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The resource with this `resourceType` and `id`, read straight from the fixture file. */
function fixtureResource(resourceType: string, id: string): unknown {
  const bundle: unknown = JSON.parse(readFileSync(FIXTURE, 'utf-8'));
  const entries =
    isRecord(bundle) && Array.isArray(bundle.entry) ? bundle.entry : [];
  for (const entry of entries as unknown[]) {
    const resource = isRecord(entry) ? entry.resource : undefined;
    if (
      isRecord(resource) &&
      resource.resourceType === resourceType &&
      resource.id === id
    ) {
      return resource;
    }
  }
  throw new Error(`${resourceType}/${id} not in fixture`);
}

describe('rawJson and timelineEvent (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const gql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables })
      .expect(200);

  it('Patient.rawJson is the fixture Patient resource', async () => {
    const res = await gql('{ patient(id: "pat-amelia-hartwell") { rawJson } }');
    expect(res.body.errors).toBeUndefined();
    expect(JSON.parse(res.body.data.patient.rawJson as string)).toEqual(
      fixtureResource('Patient', 'pat-amelia-hartwell'),
    );
  });

  it.each([
    ['Encounter', 'enc-amelia-2023-03-14'],
    ['Condition', 'cond-amelia-t2dm'],
    ['Observation', 'obs-amelia-bmi-2023-03-14'],
  ])('timelineEvent rawJson is the fixture %s %s', async (type, id) => {
    const res = await gql(
      'query ($id: ID!) { timelineEvent(id: $id) { id rawJson } }',
      { id: `${type}/${id}` },
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.timelineEvent.id).toBe(`${type}/${id}`);
    expect(JSON.parse(res.body.data.timelineEvent.rawJson as string)).toEqual(
      fixtureResource(type, id),
    );
  });

  it('Patient.timeline events carry the same rawJson', async () => {
    const res = await gql(
      '{ patient(id: "pat-amelia-hartwell") { timeline { id rawJson } } }',
    );
    expect(res.body.errors).toBeUndefined();
    const event = (
      res.body.data.patient.timeline as { id: string; rawJson: string }[]
    ).find((e) => e.id === 'Condition/cond-amelia-t2dm');
    expect(JSON.parse(event?.rawJson ?? 'null')).toEqual(
      fixtureResource('Condition', 'cond-amelia-t2dm'),
    );
  });

  it.each(['Observation/nope', 'Patient/pat-amelia-hartwell', 'nope'])(
    'timelineEvent(id: "%s") returns null with no errors',
    async (id) => {
      const res = await gql(
        'query ($id: ID!) { timelineEvent(id: $id) { id } }',
        { id },
      );
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.timelineEvent).toBeNull();
    },
  );
});
