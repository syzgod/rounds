import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('Patients GraphQL (e2e)', () => {
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

  it('{ patients } returns the six fixture patients sorted by display name', async () => {
    const res = await gql('{ patients { id displayName } }');

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.patients).toEqual([
      { id: 'pat-amelia-hartwell', displayName: 'Amelia Rose Hartwell' },
      { id: 'pat-jonah-reyes', displayName: 'Jonah Miguel Reyes' },
      { id: 'pat-leilani-kahale', displayName: 'Leilani Mae Kahale' },
      { id: 'pat-okafor-minimal', displayName: 'Okafor' },
      { id: 'pat-priya-natarajan', displayName: 'Priya Natarajan' },
      { id: 'pat-tomasz-kowalczyk', displayName: 'Tomasz Kowalczyk' },
    ]);
  });

  it('patient(id) returns flattened fields, with nulls for the minimal patient', async () => {
    const query = `query Patient($id: ID!) {
      patient(id: $id) { id displayName gender birthDate mrn }
    }`;

    const full = await gql(query, { id: 'pat-amelia-hartwell' });
    expect(full.body.data.patient).toEqual({
      id: 'pat-amelia-hartwell',
      displayName: 'Amelia Rose Hartwell',
      gender: 'FEMALE',
      birthDate: '1985-12-10',
      mrn: 'MRN-100001',
    });

    const minimal = await gql(query, { id: 'pat-okafor-minimal' });
    expect(minimal.body.data.patient).toEqual({
      id: 'pat-okafor-minimal',
      displayName: 'Okafor',
      gender: null,
      birthDate: null,
      mrn: null,
    });
  });

  it('patient(id: "nope") returns null without errors', async () => {
    const res = await gql('{ patient(id: "nope") { id } }');

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data).toEqual({ patient: null });
  });
});
