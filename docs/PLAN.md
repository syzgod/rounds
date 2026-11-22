# Rounds: MVP plan

A 3-day interview MVP. Each milestone ends in a working app that can be checked on its own: its **Done when** list is the definition of done, on top of the project-wide `pnpm typecheck` + `pnpm test` (see `CLAUDE.md`). Finish the milestones in order, and mark one ✅ only after every check in its list passes.

| # | Milestone | Day | Status |
|---|---|---|---|
| M1 | Apollo health check | 1 | ✅ |
| M2 | FHIR fixtures + Patient Directory | 1 | ✅ |
| M3 | Patient Details timeline | 2 | ✅ |
| M4 | FHIR Resource Inspector | 2 | ⬜ |
| M5 | Tests + polish | 3 | ⬜ |

**Scope decisions.** Fixtures are hand-authored and Synthea-style. The timeline covers Encounter, Condition and Observation. The Directory searches by name on the client, with no pagination. There is no router: the layout is a list beside a details pane, and the selected patient is held in React state.

---

## M1: Apollo health check ✅

Proves the whole chain works: the web app (Apollo Client v4) calls the API (NestJS code-first GraphQL), with CORS allowed for `:5173`.

**Done when**
- [x] `health: String!` is in `apps/api/src/schema.gql`, and the query returns `"ok"`. Covered by `src/health/health.resolver.spec.ts` and `test/health.e2e-spec.ts`.
- [x] The header badge shows loading, connected, and error with a Retry button. Covered by `src/components/health-status.test.tsx`.

## M2: FHIR fixtures + Patient Directory ✅

**Data:** `data/fhir/*.json` holds 6 patient Bundles. Each contains 1 Patient and roughly 3–6 each of Encounter, Condition and Observation. Ids are stable and readable (`pat-ada-lovelace`), and both reference forms appear (`Patient/<id>` and `urn:uuid:<id>`). One patient has only the minimum fields (no birth date, a single name part) to exercise the null handling.

**API**
- `src/fhir/`: `FhirRepositoryService` loads the bundles once (`FHIR_DATA_DIR`) and indexes them by id and by `fullUrl`. It also holds the `resourceType` type guards and the reference resolver.
- `src/patients/`: `PatientMapper` (FHIR `Patient` → `PatientDto { id, displayName, gender, birthDate, mrn }`), `PatientsService`, and a thin `PatientsResolver`.
- Queries: `patients: [Patient!]!` and `patient(id: ID!): Patient` (returns `null` when the id is unknown).

**Web**
- A Patient Directory: a name search field above a list. Arrow keys move through the list, Enter selects a patient, and the selection highlights the matching row.
- Empty-search, loading and error states.

**Done when**
- [x] Mapper specs pass for a full patient, a minimal patient and a malformed one (a missing `resourceType` is rejected by the type guard). `src/patients/patient.mapper.spec.ts`
- [x] Repository spec: loads all 6 bundles, resolves both reference forms, and returns `null` for an unknown reference. `src/fhir/fhir-repository.service.spec.ts`
- [x] E2E: `{ patients { id displayName } }` returns the 6 fixture ids, and `patient(id: "nope")` returns `null` with no `errors`. `test/patients.e2e-spec.ts`
- [x] Web tests: the list renders from `MockedProvider`, typing filters by name, and ArrowDown + Enter selects a patient without the mouse. `src/components/patient-directory.test.tsx`
- [x] `pnpm dev` shows the 6 patients in the browser.

## M3: Patient Details timeline ✅

**API**
- `src/timeline/`: one mapper per resource type, all producing `TimelineEventDto { id, kind, date, title, detail, status }`, where `kind` is `ENCOUNTER | CONDITION | OBSERVATION`.
- `id` is `"<ResourceType>/<id>"`, so events from different resource types can't collide in the cache.
- Dates: `Encounter.period.start`; `Condition.onsetDateTime`, falling back to `recordedDate`; `Observation.effectiveDateTime`, falling back to `issued`.
- Observation `detail`: a `valueQuantity` becomes `"<value> <unit>"`, a `valueCodeableConcept` becomes its display text, and blood-pressure components become `"120/80 mmHg"`.
- `Patient.timeline: [TimelineEvent!]!` is a resolve field that delegates to `TimelineService`, sorted newest first, with undated events last.

**Web**
- A details pane: a patient header (name, age, gender, MRN) above the timeline, grouped by date.
- A kind filter built from Base UI toggle buttons, usable from the keyboard.
- Loading, error and empty-timeline states.

**Done when**
- [x] Each mapper has full, minimal and malformed specs, and the BP Observation maps to `"120/80 mmHg"`. `src/timeline/timeline.mapper.spec.ts`
- [x] A sort spec covers newest-first order and undated events last. `src/timeline/timeline.mapper.spec.ts`
- [x] E2E: the timeline for a fixture patient returns the expected event ids in the expected order. `test/timeline.e2e-spec.ts`
- [x] Web tests: events render grouped by date, the kind filter hides and shows events, and the empty state shows for the minimal patient. `src/components/patient-timeline.test.tsx`

## M4: FHIR Resource Inspector

**API**
- `rawJson: String` on `Patient` and `TimelineEvent`. It holds `JSON.stringify(resource)` of the original FHIR resource.
- A `timelineEvent(id: ID!): TimelineEvent` query, so the Inspector can fetch one event by its `id`.

**Web**
- An "Inspect" button on the patient header and on each timeline event. It opens a Base UI Dialog that runs its own small query (`{ id rawJson }`). Apollo merges the result into the cached object for that id.
- The Dialog shows the JSON pretty-printed, read-only, with a Copy button. The client only formats `rawJson` for display; it never reads business fields out of it.
- Focus is trapped while the Dialog is open, Escape closes it, and focus returns to the button that opened it.

**Done when**
- [ ] E2E: `JSON.parse(rawJson)` deep-equals the matching fixture resource, for one Patient and one event of each kind.
- [ ] Directory and timeline query documents don't select `rawJson`. Asserted in a web test.
- [ ] Web tests: the Dialog opens from the keyboard, shows the formatted JSON, closes on Escape and returns focus to its trigger, and the Copy button calls the clipboard.

## M5: Tests + polish

- Coverage pass over the API mappers and services (`pnpm test:api -- --coverage`); every uncovered branch either gets a test or a note explaining why it's untested.
- Consistent loading, error and empty states. Dark mode checked on every view.
- A root `lint` script (`pnpm --filter api --filter web run lint`), with lint passing.
- Root `README.md`: what the app is, `pnpm install && pnpm dev`, the fixture format, and a 3-minute demo script.

**Done when**
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` and `pnpm lint` all pass.
- [ ] The whole demo script works with the keyboard alone (directory → patient → filter → inspect → Escape) and works in dark mode.
- [ ] A fresh clone runs with the README steps alone.
