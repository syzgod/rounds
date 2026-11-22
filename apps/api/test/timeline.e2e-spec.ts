import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

const TIMELINE_QUERY = `query Timeline($id: ID!) {
  patient(id: $id) {
    id
    timeline { id kind date endDate title detail category code categoryCode status flag }
  }
}`;

type TimelineEvent = {
  id: string;
  kind: string;
  date: string | null;
  title: string;
  detail: string | null;
  code: string | null;
  categoryCode: string | null;
  flag: string | null;
};

describe('Patient timeline GraphQL (e2e)', () => {
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

  async function timeline(id: string): Promise<TimelineEvent[]> {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: TIMELINE_QUERY, variables: { id } })
      .expect(200);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.patient.timeline as TimelineEvent[];
  }

  it('returns a urn:uuid bundle patient’s events newest first', async () => {
    const events = await timeline('pat-amelia-hartwell');

    expect(events.map((e) => e.id)).toEqual([
      'Observation/obs-amelia-hba1c-2025-06-17',
      'Observation/obs-amelia-bp-2025-06-17',
      'Observation/obs-amelia-weight-2025-06-17',
      'Observation/obs-amelia-glucose-2025-02-03',
      'Encounter/enc-amelia-2025-02-03',
      'Condition/cond-amelia-hypoglycemia',
      'Observation/obs-amelia-hba1c-2025-01-14',
      'Observation/obs-amelia-weight-2025-01-14',
      'Observation/obs-amelia-bp-2024-11-05',
      'Observation/obs-amelia-hba1c-2024-07-22',
      'Observation/obs-amelia-bp-2024-07-22',
      'Observation/obs-amelia-weight-2024-07-22',
      'Encounter/enc-amelia-2024-07-22',
      'Observation/obs-amelia-hba1c-2024-01-09',
      'Observation/obs-amelia-bp-2024-01-09',
      'Observation/obs-amelia-weight-2024-01-09',
      'Encounter/enc-amelia-2024-01-09',
      'Condition/cond-amelia-hypertension',
      'Observation/obs-amelia-hba1c-2023-09-12',
      'Observation/obs-amelia-bp-2023-09-12',
      'Observation/obs-amelia-weight-2023-09-12',
      'Observation/obs-amelia-smoking-status',
      'Observation/obs-amelia-hba1c-2023-03-14',
      'Observation/obs-amelia-bp-2023-03-14',
      'Observation/obs-amelia-bmi-2023-03-14',
      'Observation/obs-amelia-weight-2023-03-14',
      'Encounter/enc-amelia-2023-03-14',
      'Condition/cond-amelia-t2dm',
    ]);
    const byId = new Map(events.map((e) => [e.id, e]));
    expect(byId.get('Observation/obs-amelia-glucose-2025-02-03')).toMatchObject(
      {
        detail: '52 mg/dL',
        flag: 'LOW',
        code: '2339-0',
        categoryCode: 'laboratory',
      },
    );
    expect(byId.get('Encounter/enc-amelia-2025-02-03')).toMatchObject({
      code: null,
      categoryCode: 'EMER',
    });
    expect(byId.get('Observation/obs-amelia-bp-2024-01-09')?.detail).toBe(
      '142/91 mmHg',
    );
    expect(byId.get('Observation/obs-amelia-smoking-status')).toMatchObject({
      date: '2023-03-14T09:40:00Z',
      detail: 'Never smoker',
    });
  });

  it('resolves Type/id references (collection bundle) and keeps patients separate', async () => {
    const events = await timeline('pat-jonah-reyes');

    expect(events).toHaveLength(19);
    expect(events.every((e) => e.id.includes('jonah'))).toBe(true);
    expect(events[0]?.id).toBe('Observation/obs-jonah-resp-rate-2025-06-03');
  });

  it('returns an empty timeline for the minimal patient', async () => {
    expect(await timeline('pat-okafor-minimal')).toEqual([]);
  });
});
