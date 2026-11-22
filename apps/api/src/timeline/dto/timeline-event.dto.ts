import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum TimelineEventKind {
  ENCOUNTER = 'ENCOUNTER',
  CONDITION = 'CONDITION',
  OBSERVATION = 'OBSERVATION',
}

registerEnumType(TimelineEventKind, {
  name: 'TimelineEventKind',
  description: 'The FHIR resource type behind a timeline event.',
});

/** Display-level reading of FHIR Observation.interpretation. */
export enum ObservationFlag {
  LOW = 'LOW',
  HIGH = 'HIGH',
  ABNORMAL = 'ABNORMAL',
}

registerEnumType(ObservationFlag, {
  name: 'ObservationFlag',
  description:
    'Out-of-range result flag derived from Observation.interpretation.',
});

@ObjectType('TimelineEvent', {
  description:
    'One clinical event (Encounter, Condition or Observation), flattened for display.',
})
export class TimelineEventDto {
  @Field(() => ID, {
    description:
      '"<ResourceType>/<id>", unique across resource types for cache normalization.',
  })
  id!: string;

  @Field(() => TimelineEventKind)
  kind!: TimelineEventKind;

  @Field(() => String, {
    nullable: true,
    description:
      'FHIR date or dateTime the event is placed at (Encounter.period.start, Condition onset/recorded, Observation effective/issued).',
  })
  date!: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'End of the event when known (Encounter.period.end, Condition.abatementDateTime).',
  })
  endDate!: string | null;

  @Field(() => String, { description: 'Human-readable name of the event.' })
  title!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Formatted result for Observations, e.g. "7.8 %" or "120/80 mmHg".',
  })
  detail!: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'Encounter class, Condition category or Observation category, e.g. "Emergency" or "Vital signs".',
  })
  category!: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'LOINC code of an Observation, so clients can translate `title`. Null for Encounters and Conditions.',
  })
  code!: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'Code behind `category`: Encounter class (e.g. "EMER") or Condition/Observation category (e.g. "vital-signs"), so clients can translate it.',
  })
  categoryCode!: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'FHIR status code: Encounter.status, Condition clinical status, Observation.status.',
  })
  status!: string | null;

  @Field(() => ObservationFlag, { nullable: true })
  flag!: ObservationFlag | null;

  @Field(() => String, {
    nullable: true,
    description:
      'ISO date-time when a clinician acknowledged this flagged result; null when open.',
  })
  acknowledgedAt!: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'Initials of the clinician who acknowledged it (not verified).',
  })
  acknowledgedBy!: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'The original FHIR resource as JSON. For the Resource Inspector only; do not read business fields from it.',
  })
  rawJson!: string | null;
}
