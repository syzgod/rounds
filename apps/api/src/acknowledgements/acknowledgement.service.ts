import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, sourceOf } from '../fhir/data-source.js';
import { isObservation } from '../fhir/fhir-guards.js';
import { FhirRepositoryService } from '../fhir/fhir-repository.service.js';
import { observationFlag } from '../timeline/timeline.mapper.js';
import { AuditAction, type AuditEntryDto } from './dto/audit-entry.dto.js';

/** Injectable clock, so tests can fix the time. */
export const CLOCK = Symbol('CLOCK');
export type Clock = () => Date;

/** 1–8 characters: letters, then letters, dots, hyphens or spaces ("VB", "Dr. K"). */
const INITIALS = /^\p{L}[\p{L}. -]{0,7}$/u;

type Acknowledgement = { by: string; at: string; patientId: string };

/**
 * Acknowledgements of flagged results and their append-only audit log.
 * In memory on purpose (a database is a non-goal): both reset on restart.
 */
@Injectable()
export class AcknowledgementService {
  private readonly byResource = new Map<string, Acknowledgement>();
  private readonly log: (AuditEntryDto & { patientId: string })[] = [];

  constructor(
    private readonly fhir: FhirRepositoryService,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  /** Acknowledges a flagged Observation. Repeating it changes nothing and logs nothing. */
  acknowledge(resourceId: string, initials: string): void {
    const by = initials.trim();
    if (!INITIALS.test(by)) {
      throw new BadRequestException('Initials must be 1–8 letters.');
    }
    if (sourceOf(resourceId) === DataSource.LIVE) {
      throw new BadRequestException('Live data is read-only.');
    }
    const resource = this.fhir.resolve({ reference: resourceId });
    if (!resource || !isObservation(resource)) {
      throw new NotFoundException(`No result ${resourceId}.`);
    }
    if (observationFlag(resource) === null) {
      throw new BadRequestException(
        'Only flagged results can be acknowledged.',
      );
    }
    if (this.byResource.has(resourceId)) return;
    const patientId = this.fhir.resolve(resource.subject)?.id ?? '';
    const at = this.now().toISOString();
    this.byResource.set(resourceId, { by, at, patientId });
    this.log.push({
      id: `audit-${this.log.length + 1}`,
      action: AuditAction.ACKNOWLEDGED,
      resourceId,
      by,
      at,
      patientId,
    });
  }

  get(resourceId: string): { by: string; at: string } | null {
    const ack = this.byResource.get(resourceId);
    return ack ? { by: ack.by, at: ack.at } : null;
  }

  isAcknowledged(resourceId: string): boolean {
    return this.byResource.has(resourceId);
  }

  /** The patient's audit entries, newest first. */
  auditLog(patientId: string): AuditEntryDto[] {
    return this.log
      .filter((entry) => entry.patientId === patientId)
      .reverse()
      .map(({ patientId: _patientId, ...entry }) => entry);
  }
}
