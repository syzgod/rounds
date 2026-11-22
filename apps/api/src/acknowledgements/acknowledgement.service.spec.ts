import { BadRequestException, NotFoundException } from '@nestjs/common';
import { join } from 'node:path';
import { FhirRepositoryService } from '../fhir/fhir-repository.service.js';
import { AcknowledgementService } from './acknowledgement.service.js';

const FIXTURES_DIR = join(import.meta.dirname, '../../../../data/fhir');
const GLUCOSE = 'Observation/obs-amelia-glucose-2025-02-03'; // flagged LOW
const SMOKING = 'Observation/obs-amelia-smoking-status'; // not flagged
const AMELIA = 'pat-amelia-hartwell';

describe('AcknowledgementService', () => {
  let fhir: FhirRepositoryService;
  let service: AcknowledgementService;

  beforeAll(async () => {
    fhir = new FhirRepositoryService(FIXTURES_DIR);
    await fhir.onModuleInit();
  });

  beforeEach(() => {
    service = new AcknowledgementService(
      fhir,
      () => new Date('2026-11-22T14:05:00Z'),
    );
  });

  it('acknowledges a flagged result once and logs it', () => {
    service.acknowledge(GLUCOSE, '  VB ');
    service.acknowledge(GLUCOSE, 'XY');

    expect(service.get(GLUCOSE)).toEqual({
      by: 'VB',
      at: '2026-11-22T14:05:00.000Z',
    });
    expect(service.auditLog(AMELIA)).toEqual([
      {
        id: 'audit-1',
        action: 'ACKNOWLEDGED',
        resourceId: GLUCOSE,
        by: 'VB',
        at: '2026-11-22T14:05:00.000Z',
      },
    ]);
    expect(service.auditLog('pat-jonah-reyes')).toEqual([]);
  });

  it('rejects unflagged results, other resources and unknown ids', () => {
    expect(() => service.acknowledge(SMOKING, 'VB')).toThrow(
      BadRequestException,
    );
    expect(() =>
      service.acknowledge('Encounter/enc-amelia-2025-02-03', 'VB'),
    ).toThrow(NotFoundException);
    expect(() => service.acknowledge('Observation/nope', 'VB')).toThrow(
      NotFoundException,
    );
    expect(service.auditLog(AMELIA)).toEqual([]);
  });

  it.each(['', '   ', '1B', 'ABCDEFGHI', '<b>'])(
    'rejects invalid initials %j',
    (initials) => {
      expect(() => service.acknowledge(GLUCOSE, initials)).toThrow(
        BadRequestException,
      );
    },
  );

  it.each(['VB', 'Dr. K', 'Ö-M'])('accepts initials %j', (initials) => {
    service.acknowledge(GLUCOSE, initials);
    expect(service.isAcknowledged(GLUCOSE)).toBe(true);
  });
});
