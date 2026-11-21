import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

/** FHIR R4 AdministrativeGender; values match the FHIR codes. */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNKNOWN = 'unknown',
}

registerEnumType(Gender, {
  name: 'Gender',
  description: 'FHIR R4 administrative gender.',
});

@ObjectType('Patient', {
  description: 'A patient, flattened from a FHIR R4 Patient resource.',
})
export class PatientDto {
  @Field(() => ID, { description: 'FHIR Patient.id.' })
  id!: string;

  @Field(() => String, {
    description:
      'Display-ready full name (official name preferred, prefixes omitted).',
  })
  displayName!: string;

  @Field(() => Gender, { nullable: true })
  gender!: Gender | null;

  @Field(() => String, {
    nullable: true,
    description: 'FHIR date: YYYY, YYYY-MM or YYYY-MM-DD.',
  })
  birthDate!: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Medical record number (identifier of type MR).',
  })
  mrn!: string | null;
}
