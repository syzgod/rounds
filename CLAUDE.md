# FHIRside (FHIR Patient Explorer)

FHIRside is a 3-day interview MVP: a read-only explorer for synthetic FHIR R4 patient data. The current milestone and its "Done when" check are in [docs/PLAN.md](docs/PLAN.md). Read [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md) before changing the data flow or the GraphQL contract. Rules for each app load from `.claude/rules/`.

## Commands

Run these from the repo root. Each one delegates to the apps with `pnpm --filter`.

- `pnpm dev`: starts the API (`:3000/graphql`) and the web app (`:5173`)
- `pnpm typecheck` / `pnpm test` / `pnpm test:e2e`
- Add dependencies with `pnpm --filter <api|web> add <pkg>` (`-D` for dev). Run tools with `pnpm exec` or `pnpm dlx`.

**Done** means `pnpm typecheck` and `pnpm test` pass and the milestone's "Done when" check in `docs/PLAN.md` holds.

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

- The main chat is the orchestrator. Delegate implementation, research and reviews to subagents, and choose `model` and `effort` per task: `haiku`/low for mechanical edits, `sonnet`/medium for well-specified features, `opus`/high for plans and tricky debugging.
- When a task is vague, have a stronger model write the plan, then let a cheaper model execute it as a subagent.
- Prefer scripts, MCP tools and skills to manual, multi-step token-heavy work.
- Now and then, trim the `.md` files the agents load (`CLAUDE.md`, `.claude/rules/**`) to cut tokens.
- Keep PRs small, with a short description: a summary of 1–3 bullets and how it was tested.

## Non-goals

These are out of scope for the MVP. Check with the user before adding any of them.

- A database, ORM or remote FHIR server. Data comes only from the JSON bundles in `data/fhir/`.
- Authentication, user accounts or authorization.
- AI or LLM calls at runtime.
- Creating, editing or deleting FHIR data. The app only reads.
- FHIR versions other than R4.
- Timeline resource types beyond Encounter, Condition and Observation.
