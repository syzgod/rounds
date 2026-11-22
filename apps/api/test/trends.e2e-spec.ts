import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

const TRENDS_QUERY = `query Trends($id: ID!) {
  patient(id: $id) {
    id
    trends { id code title unit points { id date value secondaryValue flag } }
  }
}`;

type Trend = {
  id: string;
  code: string;
  title: string;
  unit: string | null;
  points: {
    id: string;
    date: string;
    value: number;
    secondaryValue: number | null;
    flag: string | null;
  }[];
};

describe('Patient trends GraphQL (e2e)', () => {
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

  async function trends(id: string): Promise<Trend[]> {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: TRENDS_QUERY, variables: { id } })
      .expect(200);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.patient.trends as Trend[];
  }

  it('returns the diabetic patient series with ordered points', async () => {
    const result = await trends('pat-amelia-hartwell');

    expect(result.map((t) => t.id)).toEqual([
      'pat-amelia-hartwell/4548-4',
      'pat-amelia-hartwell/85354-9',
      'pat-amelia-hartwell/29463-7',
    ]);

    const hba1c = result[0]!;
    expect(hba1c.unit).toBe('%');
    expect(hba1c.points).toHaveLength(6);
    expect(hba1c.points[0]).toMatchObject({
      id: 'Observation/obs-amelia-hba1c-2023-03-14',
      value: 7.8,
      secondaryValue: null,
    });
    expect(hba1c.points.some((p) => p.flag === 'HIGH')).toBe(true);
    const dates = hba1c.points.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);

    const bp = result.find((t) => t.code === '85354-9')!;
    expect(bp.unit).toBe('mmHg');
    expect(bp.points.find((p) => p.id.endsWith('bp-2024-01-09'))).toMatchObject(
      { value: 142, secondaryValue: 91 },
    );
  });

  it('resolves Type/id bundles and leaves single-point series out', async () => {
    const result = await trends('pat-jonah-reyes');
    expect(result.map((t) => t.code).sort()).toEqual(['59408-5', '9279-1']);
  });

  it('returns an empty list for the minimal patient', async () => {
    expect(await trends('pat-okafor-minimal')).toEqual([]);
  });
});
