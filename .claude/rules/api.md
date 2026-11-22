---
paths:
  - "apps/api/**"
  - "data/fhir/**"
---

# apps/api rules

## NestJS, native ESM

- Relative imports end in `.js`, also in specs. Package subpaths follow the package exports (`'fhir/r4.js'`, `'supertest/types.js'`).
- Use `import.meta.dirname`; `__dirname` and `require` are not available.
- One Nest module per feature folder, imported by `AppModule`. Bootstrap (CORS from `WEB_ORIGIN`, `PORT`) stays in `main.ts`.
- Before you add a library, check for a first-party Nest package (`apps/api/AGENTS.md`).

## Code-first GraphQL

- DTOs are `@ObjectType()` classes in `<feature>/dto/*.dto.ts`, with a `description` on the type and on fields that are not obvious.
- Give every `@Field` an explicit type function (`@Field(() => ID)`): reflected metadata is unreliable under ESM and `isolatedModules`.
- Nullable fields: `@Field(() => String, { nullable: true }) x!: string | null`. TS type and GraphQL nullability agree.
- Codes next to display text (`code`, `categoryCode`) let the web app translate; the API stays language-neutral.
- Review the `schema.gql` diff with every DTO change.

## FHIR R4 boundary

- Import R4 types explicitly: `import type { Patient } from 'fhir/r4.js'`. FHIR types appear only in `src/fhir/**`, `*.service.ts` and `*.mapper.ts`.
- Fixture JSON enters as `unknown` and is narrowed with guards from `src/fhir/fhir-guards.ts`.
- Mappers are pure. Missing optional FHIR data maps to `null`.

## Fixtures (`data/fhir/`)

- One hand-written R4 `Bundle` per patient (`collection` or `transaction`), with real code systems (LOINC, SNOMED CT, HL7 categories) and stable, readable ids that tests assert on.
- Only `FhirRepositoryService` reads files. Type parsed bundles as `Bundle<FhirResource>`.
- The live source (`LiveFhirService`) is read-only. Services pick the source from the id (`live-` prefix, `src/fhir/data-source.ts`) and prefix every DTO id they return.
- References come as `Patient/<id>` or `urn:uuid:<uuid>` (matches `fullUrl`, differs from `id`). Resolve both through `FhirRepositoryService.resolve`; unknown → `null`.

## Testing (Vitest, globals on)

- Unit specs sit beside the code (`*.spec.ts`); e2e specs are `test/*.e2e-spec.ts` and send real GraphQL over HTTP with Supertest.
- Each mapper gets specs with small inline resources: full, minimal and malformed.
- Load the `nestjs-testing` skill for specs and `graphql-schema` for DTO or nullability changes.
