# ADR-001: Core architecture for the FHIR Patient Explorer MVP

- **Status:** Accepted
- **Date:** 2026-11-21
- **Scope:** `apps/api`, `apps/web`, `data/fhir`

## Context

The FHIR Patient Explorer is a read-only tool for browsing patient records stored as HL7 FHIR R4 resources (Patient, Observation, Condition, Encounter, …). FHIR resources are deeply nested and polymorphic (`HumanName[]`, `CodeableConcept`, `value[x]`), and they are designed for interchange rather than display. The MVP has to show a clean, keyboard-friendly UI over this data. It must also let a user look at the original resource, so they can confirm exactly what the source contained.

The MVP deliberately excludes authentication, persistence and AI features. The architecture should keep the first iteration small without blocking any of these later.

## Decision A: Map FHIR R4 resources to flat GraphQL DTOs, plus `rawJson`

The API exposes **flat, display-oriented GraphQL DTOs** instead of mirroring the FHIR schema.

- Every object type has a non-null `id: ID!`, taken from `Resource.id`.
- Nested FHIR structures are reduced to scalars, enums or lists of other flat DTOs in the API layer. For example, `HumanName[]` becomes `displayName: String!`, and `CodeableConcept` becomes `code` + `display`.
- Each DTO that represents a resource also has a field `rawJson: String` holding the original serialized resource. Only the **Resource Inspector** view uses it.
- All FHIR parsing, narrowing and mapping happens in dedicated NestJS services and mappers, typed with `@types/fhir` (`fhir/r4`). GraphQL resolvers only delegate to them.

**Consequences**

- The UI gets simple, stable types and has no knowledge of FHIR. The mapping rules are in one place and can be unit-tested as pure functions.
- Some information is lost in each DTO. `rawJson` keeps the original data available for inspection without growing the schema.
- Supporting a new resource type means adding a mapper, a DTO and a resolver. A generic FHIR-shaped schema would not need this, but it would push FHIR complexity into every client.
- `rawJson` is an opaque string. Clients must never parse it to read business fields; when a field is needed, it gets promoted to a real DTO field.

## Decision B: Local synthetic FHIR R4 JSON fixtures instead of a database

For the MVP, the API reads **synthetic FHIR R4 JSON fixtures** from `data/fhir/` (for example Synthea-style bundles). It does not use a database or a remote FHIR server.

- Fixtures enter the code as `unknown` and are narrowed with `resourceType` type guards before mapping.
- A single repository-style service owns fixture loading. All other services depend on that service, never on the file system directly.

**Consequences**

- The project needs no infrastructure: no containers, no migrations, no credentials. Tests and local development are deterministic.
- Synthetic data contains no PHI, so the repository and its fixtures can be shared freely.
- The data is read-only and limited by memory, which is acceptable for the MVP's dataset size.
- Moving to a real FHIR server (HAPI, Azure Health Data Services, …) or a database later changes only the loading service. DTOs, resolvers and the web app stay the same.

## Decision C: Standardize on Apollo Client v4 + NestJS code-first Apollo Server v5

- **Server:** NestJS 12 with `@nestjs/graphql` and `@nestjs/apollo`, using the **code-first** approach. The SDL is generated from decorated TypeScript classes into `apps/api/src/schema.gql`. Apollo Server v5 runs through the Express 5 integration (`@as-integrations/express5`).
- **Client:** Apollo Client v4 with `InMemoryCache` and an explicit `HttpLink` (`VITE_GRAPHQL_URL`). React bindings come from `@apollo/client/react`, and errors are handled with the v4 `ErrorLike` guards (`CombinedGraphQLErrors.is`, …).
- The two apps share `graphql@^16`, because Apollo Server v5 requires graphql 16.

**Consequences**

- With code-first, the DTO classes are the single source of truth: TypeScript types and the GraphQL schema cannot drift apart. The generated `schema.gql` is committed, so contract changes show up in diffs.
- Apollo on both ends gives one ecosystem with consistent tooling, normalized caching keyed on `id`, and first-party testing utilities (`MockedProvider`).
- Both libraries recently had major releases (Apollo Client 4 removed `ApolloError` and moved the React exports; Apollo Server 5 requires Express 5 integrations). Older examples online are often wrong for these versions, so the conventions are recorded in `.claude/rules/web.md` and `.claude/rules/api.md`.
- Upgrading `graphql` to v17 has to wait until Apollo Server supports it.

## Revisit when

- The data needs to be writable, or the dataset outgrows memory (Decision B).
- Clients need FHIR-native queries or interoperability (Decision A).
- Apollo Server adds support for graphql 17 (Decision C).
