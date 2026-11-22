# Rounds

**Patient history at a glance.** A read-only patient record viewer for clinicians, built on FHIR R4 data. Named after ward rounds: going patient by patient, seeing quickly who needs attention, then checking the details.

**Live demo:** https://rounds-web-jsyv.onrender.com. The data is synthetic, so there's no real patient data. The free API sleeps when idle, so the first load can take about 30 seconds.

![CI](https://github.com/syzgod/rounds/actions/workflows/ci.yml/badge.svg)

## What it does

- **Patient list with triage:** search by name or patient number. Patients whose latest results are out of range carry an "abnormal" badge.
- **Patient record:**
  - the header shows sex, age, date of birth, patient number and active diagnoses
  - **measurements** (blood pressure, HbA1c, weight, SpO₂ and others) appear as a compact strip of small trend charts, collapsible and remembered per user
  - the **timeline** shows encounters, diagnoses and results, grouped by day, filterable and flagged high or low
- **FHIR source viewer:** every patient and every timeline entry can show its original FHIR JSON, so the source can always be verified.
- **Made for clinical work:** German and English (German first) in clinical wording, fully usable by keyboard, light and dark mode, checked for WCAG AA with axe.

## 3-minute demo script

The demo is keyboard only. The app opens in German when the browser language is German; switch with **DE/EN** in the header.

1. **Who needs attention? (30 s)** Patients whose latest results are out of range carry an "auffällig" badge with a count, for example Amelia Hartwell.
2. **Open a record (45 s)**
   - Press <kbd>/</kbd>, type `Ame`, press <kbd>↓</kbd> <kbd>Enter</kbd>.
   - The header shows active diagnoses (hypertension, type 2 diabetes).
   - **Messwerte:** HbA1c is improving, and blood pressure and weight are on track. Tab into a chart and use the arrow keys to read individual values.
3. **The detail (45 s)**
   - Tab to the timeline filter and choose **Befunde**. Results show **Erhöht** (high) or **Erniedrigt** (low) badges, such as the low glucose reading.
4. **Trust the data (30 s)**
   - Press **FHIR-Rohdaten anzeigen**. The original FHIR resource opens, with a Copy button.
   - <kbd>Esc</kbd> closes it, and focus returns to the button.
5. **Edge cases and comfort (30 s)**
   - The minimal patient "Okafor" has no data and shows calm empty states.
   - <kbd>D</kbd> toggles dark mode, and **EN** switches language.

## Run it locally

Requires Node 24 or later and pnpm, at the version pinned in `package.json`. If pnpm isn't installed, run `corepack enable` first.

```bash
pnpm install
pnpm dev          # API on http://localhost:3000/graphql, web app on http://localhost:5173
```

| Command | What it checks |
|---|---|
| `pnpm typecheck` / `pnpm lint` | Strict TypeScript, ESLint/oxlint |
| `pnpm test` | Unit and component tests (Vitest) |
| `pnpm test:e2e` | API end-to-end tests against the fixtures |
| `pnpm test:browser` | Playwright: the keyboard-only demo in German plus axe accessibility scans, light and dark |

CI runs all of these on every PR, plus a check that the committed GraphQL schema is up to date.

## How it's built

```
data/fhir/*.json  ──▶  NestJS API (code-first GraphQL)  ──▶  React app (Apollo Client)
FHIR R4 Bundles        FHIR parsed and mapped only in         flat, display-ready DTOs,
                       services; resolvers stay thin          normalized cache, no FHIR types
```

- **API (`apps/api`):** NestJS with Apollo Server 5.
  - `FhirRepositoryService` loads the bundles once and resolves both reference forms (`Patient/<id>`, `urn:uuid:`).
  - Mappers turn FHIR resources into flat DTOs.
  - The GraphQL schema is generated from code into `apps/api/src/schema.gql`.
- **Web (`apps/web`):** React 19, Vite, Apollo Client 4 and shadcn/ui on Base UI.
  - Recharts draws the trend charts and is lazy-loaded.
  - The German and English text lives in typed dictionaries, so a missing translation fails the typecheck.
- **Data (`data/fhir`):** six hand-written, Synthea-style FHIR R4 `Bundle`s, one per patient. Each holds a `Patient` plus its `Encounter`, `Condition` and `Observation` resources, linked by `subject`. One patient is deliberately minimal, to exercise empty states.
- **Deploy:** [`render.yaml`](render.yaml), a Render Blueprint with the API as a Node service and the web app as a static site, both in Frankfurt.

## Docs

- [docs/PRODUCT.md](docs/PRODUCT.md): users, the problems it solves, scope, and what was deliberately not built.
- [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md): why flat DTOs plus `rawJson`, fixtures instead of a database, and Apollo on both ends.
- [docs/AI-WORKFLOW.md](docs/AI-WORKFLOW.md): how it was built with Claude Code, including guardrails, orchestration, CI as the gate, and what went wrong.
- [docs/PLAN.md](docs/PLAN.md) and [docs/PROGRESS.md](docs/PROGRESS.md): milestones and the running log.
