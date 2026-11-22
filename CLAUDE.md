# Rounds (FHIR Patient Explorer)

Rounds is an interview MVP: a read-only explorer for synthetic FHIR R4 patient data. Status and next steps are in [docs/PROGRESS.md](docs/PROGRESS.md); milestones are in [docs/PLAN.md](docs/PLAN.md). Read [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md) before you change the data flow or the GraphQL contract. App rules load from `.claude/rules/`.

## How to think and write

- Write replies, summaries, PR text and notes in ASD-STE100 Simplified Technical English: short sentences, active voice, simple words, each fact once. Output tokens cost money.
- Apply KISS, YAGNI, DRY, SOLID, SoC and POLA. Choose the simplest solution that works today.

## Users

The users are clinicians doing fast-paced work. Code is for developers; everything on screen is for clinicians.

- **Wording:** use the words clinicians see in their EHR, German first, then English. Technical terms ("API", "GraphQL", "fixtures", raw resource ids) appear only in the FHIR source viewer.
- **Minimal UI:** each view does one obvious thing with the fewest controls. Controls carry text labels. The most-used information shows first, without clicks.
- **Errors:** one line that says what happened and what to do next ("Retry").

## Hard boundaries

1. **pnpm only.** Where scaffold docs (`apps/api/AGENTS.md`) say `npm`/`npx`, use `pnpm`/`pnpm dlx`. Add packages with `pnpm --filter <api|web> add [-D] <pkg>`.
2. **Strict TypeScript.** Outside input enters as `unknown` and is narrowed with type guards. `any`, `as any` and `@ts-ignore` are not allowed.
3. **FHIR stays in services and mappers.** Resolvers call services and return DTOs; they import no FHIR types.
4. **Flat GraphQL DTOs.** Every object type has `id: ID!`. Fields are display-ready scalars or lists of flat DTOs. `rawJson` is only for the FHIR source viewer.
5. **Base UI, keyboard first.** shadcn/ui here is built on Base UI: use the `render` prop. Every interaction works by keyboard alone.
6. **Generated files:** `apps/api/src/schema.gql` (rebuilt when the API or its tests start) and `apps/web/src/graphql/__generated__/` (`pnpm --filter web codegen`). Commit them; change them only by regenerating.
7. **Clean dependencies.** `pnpm peers check` reports no issues. `graphql` stays on `^16` (required by `@apollo/server@5`). Each build script is listed in `allowBuilds` in `pnpm-workspace.yaml` with a reason.
8. **Scopes.** Backend: `apps/api/**`, `data/fhir/**`. Frontend: `apps/web/**`. Backend changes `schema.gql` first; Frontend uses it after. Root files (`package.json`, `pnpm-workspace.yaml`, `CLAUDE.md`, `.claude/**`, `docs/**`, `.github/**`) change only with the user's approval.

## Workflow

- **Session:** read `docs/PROGRESS.md` at the start. At the end, update it: done, next, bugs, suggestions.
- **Branches:** branch from `develop`; open PRs into `develop`. Only `main` deploys to Render. A release is a PR `develop` → `main`, made when the user asks; merge it with a merge commit.
- **PRs:** small, with 1–3 summary bullets and how you tested. **Done** = CI green on the PR and the milestone's "Done when" in `docs/PLAN.md` holds.
- **Checks:** locally, run `pnpm typecheck` and the affected tests only. CI runs the full suite: push, then `gh pr checks <n> --watch` until green.
- **Delegation:** the main chat orchestrates. Give subagents a model per task: `haiku` for mechanical edits, `sonnet` for clear features, `opus` for plans and hard debugging.
- **Visual checks:** use the Playwright MCP against `pnpm dev` (API `:3000/graphql`, web `:5173`). Take a screenshot only for a visible UI change; measure everything else with `browser_evaluate` or tests.
- **Windows gotcha:** stopping a background `pnpm dev` leaves node processes on `:3000`/`:5173`. Stop them after each run, or the next run serves old code.
- **Docs:** keep this file and `.claude/rules/**` short; prune stale lines when you touch them.

## Non-goals

Ask the user before you add any of these: a database or ORM; a remote FHIR server other than the optional, read-only live source (`FHIR_SERVER_URL`); writes to a remote server; authentication or accounts; AI calls at runtime; writes to FHIR data; FHIR versions other than R4; timeline types beyond Encounter, Condition and Observation.
