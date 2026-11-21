---
paths:
  - "apps/api/**"
---

# apps/api rules

## NestJS 12, native ESM

- Relative imports end in `.js` (`import { X } from './x.service.js'`), including in specs. Package subpaths follow the package's exports (`'supertest/types.js'`, `'fhir/r4.js'`).
- Use `import.meta.dirname` / `import.meta.url` for file paths. `__dirname` and `require` don't exist here.
- `main.ts` uses top-level `await`. Keep bootstrap there: CORS (`WEB_ORIGIN`, default `http://localhost:5173`) and `PORT` (default 3000).
- Organise code as one Nest module per feature folder (`src/health/`, `src/patients/`, …), each imported by `AppModule`. Inject providers through the constructor.
- Before adding a third-party library, check whether Nest ships a first-party package for the need (see `apps/api/AGENTS.md`).

## Code-first GraphQL DTOs

- The schema is generated from decorators into `src/schema.gql` (`autoSchemaFile`, `sortSchema: true`). Treat the generated SDL as the contract, and review its diff with every DTO change.
- Each DTO is an `@ObjectType()` class in `<feature>/dto/*.dto.ts`, with a GraphQL `description` on the type and on non-obvious fields.
- Always give `@Field` an explicit type function: `@Field(() => ID) id!: string`, `@Field(() => [ObservationDto])`. ESM plus `isolatedModules` makes reflected metadata unreliable.
- `id: ID!` is non-null on every type, using the FHIR `Resource.id` (or a stable derived id when the source has none).
- Mark nullable fields explicitly: `@Field(() => String, { nullable: true }) birthDate!: string | null`. The TS type and the GraphQL nullability must agree.
- DTOs stay **flat**: scalars, enums, and lists of other flat DTOs. Reduce FHIR shapes to display-ready values (`HumanName[]` → `displayName`, `CodeableConcept` → `code` + `display`).
- `@Field(() => String, { nullable: true }) rawJson` carries `JSON.stringify(resource)` and exists only for the Resource Inspector. Clients never parse it to read business fields.
- Resolvers stay thin: they take args, call a service, and return DTOs. They import no `fhir/r4` types.

## FHIR R4 boundary (`@types/fhir`)

- Import R4 types explicitly: `import type { Patient, Bundle, Observation } from 'fhir/r4.js'` (the module behind the `fhir4` namespace). Use R4 only; the r2/r3/r4b/r5 modules are out of scope.
- FHIR types appear only in `src/fhir/**` (fixture loading, type guards) and in feature services and mappers (`*.service.ts`, `*.mapper.ts`).
- Fixture JSON enters as `unknown`. Narrow it with type guards such as `isPatient(value): value is Patient` that check `resourceType` before use; casts to FHIR types are not allowed.
- Mappers are pure functions or services from a FHIR resource to a DTO. Missing optional FHIR data maps to `null`, never to a thrown error.

## Fixture bundles (`data/fhir/`)

- Each file is one hand-authored, Synthea-style R4 `Bundle` (`type: "collection"` or `"transaction"`) for one patient: a `Patient` plus that patient's `Encounter`, `Condition` and `Observation` resources.
- Only the fixture repository service (`src/fhir/`) reads the file system. It loads every bundle once at startup, flattens `entry[].resource`, and serves the resources to the rest of the app. Feature services depend on it, never on `fs`.
- Resolve the data directory from `FHIR_DATA_DIR`, defaulting to `join(process.cwd(), '../../data/fhir')` (scripts run with cwd `apps/api`).
- References come in two forms, `"Patient/<id>"` and `"urn:uuid:<id>"` (matching an entry's `fullUrl`). Index entries under both, and resolve through one helper. An unresolvable reference maps to `null`.
- Fixtures use real code systems (LOINC for Observations, SNOMED CT for Conditions, `http://terminology.hl7.org` for categories) and stable, readable ids. Tests assert on those ids.

## Testing (Vitest 4)

- Unit specs sit beside the code as `*.spec.ts` (run with `pnpm --filter api test`). E2E specs live in `test/*.e2e-spec.ts` (run with `pnpm --filter api test:e2e`).
- Vitest globals are on (`describe`, `it`, `expect`, `vi`). Mocks are `vi.fn()` / `vi.spyOn()`.
- Build providers with `Test.createTestingModule`. Swap dependencies with `.overrideProvider(X).useValue(...)`.
- Every mapper gets focused specs that use small inline FHIR resources: a full resource, a resource with only the minimum fields, and a malformed one.
- E2E tests send real GraphQL over HTTP: `request(app.getHttpServer()).post('/graphql').send({ query })`, and assert on `{ data }` and `errors`.

## Skills

- Load `nestjs-testing` when writing or fixing specs.
- Load `graphql-schema` when adding or changing DTOs, arguments or nullability.
