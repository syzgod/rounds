import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

const GLUCOSE = 'Observation/obs-amelia-glucose-2025-02-03';
const ACK = `mutation Ack($id: ID!, $initials: String!) {
  acknowledgeResult(id: $id, initials: $initials) { id flag acknowledgedAt acknowledgedBy needsAcknowledgement }
}`;
const EVENT = `query Event($id: ID!) { timelineEvent(id: $id) { needsAcknowledgement } }`;
const OLD_HBA1C = 'Observation/obs-amelia-hba1c-2025-01-14';
const PATIENT = `{ patient(id: "pat-amelia-hartwell") {
  abnormalResultCount
  auditLog { id action resourceId by at }
} }`;

type GqlBody = {
  data: Record<string, unknown> | null;
  errors?: { message: string; extensions?: { code?: string } }[];
};

describe('Acknowledge results GraphQL (e2e)', () => {
  let app: INestApplication<App>;

  const gql = async (
    query: string,
    variables: Record<string, string> = {},
  ): Promise<GqlBody> =>
    (
      await request(app.getHttpServer())
        .post('/graphql')
        .send({ query, variables })
        .expect(200)
    ).body as GqlBody;

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

  it('acknowledges a flagged result, logs it once and lowers the open count', async () => {
    const before = await gql(PATIENT);
    expect(before.data?.patient).toEqual({
      abnormalResultCount: 3,
      auditLog: [],
    });

    // Only the latest flagged reading of a measurement is open.
    expect((await gql(EVENT, { id: GLUCOSE })).data?.timelineEvent).toEqual({
      needsAcknowledgement: true,
    });
    expect((await gql(EVENT, { id: OLD_HBA1C })).data?.timelineEvent).toEqual({
      needsAcknowledgement: false,
    });

    const first = await gql(ACK, { id: GLUCOSE, initials: 'VB' });
    expect(first.errors).toBeUndefined();
    expect(first.data?.acknowledgeResult).toMatchObject({
      id: GLUCOSE,
      flag: 'LOW',
      acknowledgedBy: 'VB',
      needsAcknowledgement: false,
    });
    await gql(ACK, { id: GLUCOSE, initials: 'XY' });

    const after = await gql(PATIENT);
    expect(after.data?.patient).toMatchObject({
      abnormalResultCount: 2,
      auditLog: [
        {
          id: 'audit-1',
          action: 'ACKNOWLEDGED',
          resourceId: GLUCOSE,
          by: 'VB',
        },
      ],
    });
  });

  it('rejects bad initials and unflagged results with a clear error', async () => {
    const badInitials = await gql(ACK, { id: GLUCOSE, initials: '1' });
    expect(badInitials.errors?.[0]?.message).toBe(
      'Initials must be 1–8 letters.',
    );

    const unflagged = await gql(ACK, {
      id: 'Observation/obs-amelia-smoking-status',
      initials: 'VB',
    });
    expect(unflagged.errors?.[0]?.message).toBe(
      'Only flagged results can be acknowledged.',
    );
  });
});
