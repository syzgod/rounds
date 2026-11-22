# Rounds (FHIR Patient Explorer)

Rounds is a 3-day interview MVP: a read-only explorer for synthetic FHIR R4 patient data. The current milestone and its "Done when" check are in [docs/PLAN.md](docs/PLAN.md). Read [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md) before changing the data flow or the GraphQL contract. Rules for each app load from `.claude/rules/`.

## How to think and write

- Write replies, summaries, PR text and notes in ASD-STE100 Simplified Technical English: short sentences, one instruction per sentence, active voice, simple words. Do not repeat information. Output tokens cost money.
- Apply KISS, YAGNI, DRY, SOLID, SoC and POLA. Choose the simplest solution that works. Do not add code for a possible future need.

## Users

The users are clinicians doing fast-paced work. Code and its names are for developers; everything a user sees is for clinicians.

- **Wording:** use the words clinicians see in their EHR, in English and German (German users first). Never show "API", "GraphQL", "fixtures" or a raw resource id, except in the Inspector.
- **Minimal UI:** some users have never used an EHR. Each view does one obvious thing with the fewest controls, and controls carry text labels, not icons alone. The most-used information shows first, without clicks. Leave out anything that doesn't earn its place.
- **Errors:** messages say what happened and what to do next, such as "Retry", in one line.

## Commands

Run these from the repo root. Each one delegates to the apps with `pnpm --filter`.

- `pnpm dev`: starts the API (`:3000/graphql`) and the web app (`:5173`)
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm test:e2e`
- `pnpm test:browser`: Playwright keyboard demo plus axe scans. For visual checks, use the Playwright MCP from `.mcp.json` against `pnpm dev`.
- Add dependencies with `pnpm --filter <api|web> add <pkg>` (`-D` for dev). Run tools with `pnpm exec` or `pnpm dlx`.

**Done** means CI (`.github/workflows/ci.yml`: peers check, typecheck, lint, unit and e2e tests, web build, an up-to-date `schema.gql`) is green on the PR, and the milestone's "Done when" check in `docs/PLAN.md` holds.

## Hard boundaries

1. **pnpm is the only package manager.** That excludes `npm`, `npx` and `yarn`. Where scaffold docs such as `apps/api/AGENTS.md` say `npm`, use `pnpm` instead.
2. **TypeScript stays strict.** Bring outside input in as `unknown` and narrow it with type guards; `any`, `as any` and `@ts-ignore` are not allowed.
3. **FHIR handling stays in services.** Only dedicated NestJS services and mappers parse, narrow and map FHIR R4 resources. GraphQL resolvers call those services and return DTOs; they never touch FHIR types.
4. **GraphQL DTOs are flat.** Every object type has a non-null `id: ID!`, which lets Apollo `InMemoryCache` normalize entities. Fields are display-ready scalars or lists of flat DTOs. `rawJson: String` carries the original resource and is used only by the FHIR Resource Inspector.
5. **The UI uses Base UI.** shadcn/ui here is built on Base UI (`base-nova`): change the rendered element with the `render` prop, not Radix's `asChild`. Every interaction works by keyboard alone.
6. **`apps/api/src/schema.gql` is generated.** It's rebuilt from decorators whenever the API or its tests start. Commit it, and never edit it by hand.
7. **Dependencies stay clean.** `pnpm peers check` must report no issues. `graphql` stays on `^16` in both apps, because `@apollo/server@5` requires it. Each dependency build script is approved or denied in `allowBuilds` in `pnpm-workspace.yaml`, with a comment giving the reason.
8. **Work scopes.** Backend edits `apps/api/**` and `data/fhir/**`. Frontend edits `apps/web/**`. Review/Testing runs the checks and reports findings, editing only test files unless asked to fix code. `schema.gql` is the handoff between Backend and Frontend: Backend changes the schema first and Frontend uses it afterwards. A change outside your scope goes to its owner as a handoff note. Root files (`package.json`, `pnpm-workspace.yaml`, `CLAUDE.md`, `.claude/**`, `docs/**`) change only with the user's approval.

## Agent workflow (token efficiency)

- At the start of a session, read [docs/PROGRESS.md](docs/PROGRESS.md). At the end, update it with what was done, what comes next, bugs, fixes and suggestions.
- The main chat is the orchestrator. Delegate implementation, research and reviews to subagents, and choose `model` and `effort` per task: `haiku`/low for mechanical edits, `sonnet`/medium for well-specified features, `opus`/high for plans and tricky debugging.
- When a task is vague, have a stronger model write the plan, then let a cheaper model execute it as a subagent.
- Prefer scripts, MCP tools and skills to manual, multi-step token-heavy work.
- Take Playwright screenshots only to check a visible UI change (layout, colour, overflow). Screenshots cost many tokens. For other checks, use `browser_snapshot` or tests.
- Now and then, trim the `.md` files the agents load (`CLAUDE.md`, `.claude/rules/**`) to cut tokens.
- **Branches:** start feature branches from `develop` and open PRs into `develop`. Only `main` deploys to Render. A release is a PR from `develop` into `main`, made when the user asks.
- Keep PRs small, with a short description: a summary of 1–3 bullets and how it was tested.
- Locally, run only the checks for what you changed (`pnpm typecheck` plus the affected test files). The full suite runs in CI: push, then `gh pr checks <n> --watch`, and fix the PR until it is green.

## Non-goals

These are out of scope for the MVP. Check with the user before adding any of them.

- A database, ORM or remote FHIR server. Data comes only from the JSON bundles in `data/fhir/`.
- Authentication, user accounts or authorization.
- AI or LLM calls at runtime.
- Creating, editing or deleting FHIR data. The app only reads.
- FHIR versions other than R4.
- Timeline resource types beyond Encounter, Condition and Observation.
