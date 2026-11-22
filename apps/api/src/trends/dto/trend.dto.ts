import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { ObservationFlag } from '../../timeline/dto/timeline-event.dto.js';

@ObjectType('TrendPoint', {
  description: 'One dated numeric measurement in a Trend.',
})
export class TrendPointDto {
  @Field(() => ID, {
    description: '"Observation/<id>" of the source Observation.',
  })
  id!: string;

  @Field(() => String, {
    description:
      'FHIR dateTime the measurement was taken (Observation.effectiveDateTime).',
  })
  date!: string;

  @Field(() => Float, {
    description:
      'The measured value; the systolic pressure for blood pressure panels.',
  })
  value!: number;

  @Field(() => Float, {
    nullable: true,
    description:
      'The diastolic pressure for blood pressure panels; null for other measurements.',
  })
  secondaryValue!: number | null;

  @Field(() => ObservationFlag, { nullable: true })
  flag!: ObservationFlag | null;
}

@ObjectType('Trend', {
  description:
    'A numeric measurement series for one patient (e.g. HbA1c), oldest to newest, for charts.',
})
export class TrendDto {
  @Field(() => ID, {
    description: '"<patientId>/<LOINC code>", unique per patient and series.',
  })
  id!: string;

  @Field(() => String, {
    description: 'LOINC code identifying the measurement.',
  })
  code!: string;

  @Field(() => String, {
    description:
      'Human-readable name, e.g. "Hemoglobin A1c" or "Blood pressure".',
  })
  title!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Display unit shared by every point, e.g. "%" or "mmHg".',
  })
  unit!: string | null;

  @Field(() => Float, {
    nullable: true,
    description:
      'Lower bound of the normal range from the latest measurement (systolic for blood pressure), in the series unit; null when unknown.',
  })
  referenceLow!: number | null;

  @Field(() => Float, {
    nullable: true,
    description:
      'Upper bound of the normal range from the latest measurement (systolic for blood pressure), in the series unit; null when unknown.',
  })
  referenceHigh!: number | null;

  @Field(() => Float, {
    nullable: true,
    description:
      'Lower bound of the normal range of the diastolic pressure; null for other measurements or when unknown.',
  })
  secondaryReferenceLow!: number | null;

  @Field(() => Float, {
    nullable: true,
    description:
      'Upper bound of the normal range of the diastolic pressure; null for other measurements or when unknown.',
  })
  secondaryReferenceHigh!: number | null;

  @Field(() => [TrendPointDto], {
    description: 'Measurements sorted oldest to newest; at least two.',
  })
  points!: TrendPointDto[];
}
