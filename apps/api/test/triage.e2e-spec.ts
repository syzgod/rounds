import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

const QUERY = `{ patients { id activeDiagnoses abnormalResultCount } }`;

type Row = {
  id: string;
  activeDiagnoses: string[];
  abnormalResultCount: number;
};

describe('Patient triage fields GraphQL (e2e)', () => {
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

  it('returns active diagnoses and abnormal-result counts for every fixture patient', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: QUERY })
      .expect(200);
    expect(res.body.errors).toBeUndefined();

    const rows = res.body.data.patients as Row[];
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(rows).toHaveLength(6);
    expect(byId['pat-amelia-hartwell']).toEqual({
      id: 'pat-amelia-hartwell',
      activeDiagnoses: ['Essential hypertension', 'Type 2 diabetes mellitus'],
      abnormalResultCount: 3,
    });
    expect(byId['pat-jonah-reyes']).toEqual({
      id: 'pat-jonah-reyes',
      activeDiagnoses: ['COPD'],
      abnormalResultCount: 0,
    });
    expect(byId['pat-leilani-kahale']).toEqual({
      id: 'pat-leilani-kahale',
      activeDiagnoses: [],
      abnormalResultCount: 1,
    });
    expect(byId['pat-priya-natarajan']).toEqual({
      id: 'pat-priya-natarajan',
      activeDiagnoses: ['Seasonal allergic rhinitis', 'Asthma'],
      abnormalResultCount: 0,
    });
    expect(byId['pat-tomasz-kowalczyk']).toEqual({
      id: 'pat-tomasz-kowalczyk',
      activeDiagnoses: [],
      abnormalResultCount: 1,
    });
    expect(byId['pat-okafor-minimal']).toEqual({
      id: 'pat-okafor-minimal',
      activeDiagnoses: [],
      abnormalResultCount: 0,
    });
  });
});
