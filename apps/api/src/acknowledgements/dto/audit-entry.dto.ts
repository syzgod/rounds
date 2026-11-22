import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum AuditAction {
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

registerEnumType(AuditAction, {
  name: 'AuditAction',
  description: 'What a clinician did to a result.',
});

@ObjectType('AuditEntry', {
  description:
    'One append-only audit record. In-memory for the demo: it resets when the API restarts.',
})
export class AuditEntryDto {
  @Field(() => ID, { description: 'Sequential id, e.g. "audit-1".' })
  id!: string;

  @Field(() => AuditAction)
  action!: AuditAction;

  @Field(() => ID, {
    description: 'Timeline event id of the result, "Observation/<id>".',
  })
  resourceId!: string;

  @Field(() => String, {
    description: 'Initials the clinician entered. Not verified (no accounts).',
  })
  by!: string;

  @Field(() => String, { description: 'ISO 8601 date-time of the action.' })
  at!: string;
}
