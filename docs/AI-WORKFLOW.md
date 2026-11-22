# How Rounds was built with AI (Claude Code)

Rounds was built with Claude Code as a pair: I made the product and architecture decisions, and the AI did most of the implementation inside guardrails I set. This file describes that setup and where it went wrong. Knowing where it fails is the point.

## Guardrails in the repo

- **[`CLAUDE.md`](../CLAUDE.md)** is loaded by every session and agent. It sets:
  - the hard boundaries: pnpm only; strict TypeScript, with outside input taken as `unknown` and narrowed by guards, and no `any`; FHIR handling only in NestJS services and mappers; flat GraphQL DTOs with `id: ID!`; a generated, never hand-edited `schema.gql`; no unexpected peer dependencies
  - a **Users** section: clinicians, German first, clinical wording, minimal UI
  - the agent workflow rules below
- **`.claude/rules/`** holds per-app conventions for Apollo Client 4, Apollo Server 5, NestJS and Base UI. These libraries had recent major releases, and older examples online are wrong for these versions.
- **Work scopes:** a backend agent edits `apps/api` and `data/fhir`, a frontend agent edits `apps/web`, and a review agent edits tests. `schema.gql` is the hand-off between them. Root files change only with my approval.
- **[ADR-001](ADR-001-architecture.md)** and **[PLAN.md](PLAN.md)** give each milestone a "Done when" list, which defines done more precisely than "the AI says it works".

## Orchestration

- The **main session orchestrates**: it plans, reviews, and talks to me. Implementation, research and reviews go to **subagents**, with model and effort chosen per task:

| Task | Model / effort |
|---|---|
| Well-specified features (a new GraphQL field, a component with tests) | Sonnet, medium |
| Web research (German clinical terms, company context) | Sonnet or Haiku |
| Plans, architecture, tricky debugging | Opus, high |

- **Vague tasks get a plan first** from the stronger model. A cheaper model then carries out the precise spec. Every agent brief states the API contract, the rules, the files it may touch and its expected report.
- **Parallel work in git worktrees:** backend and frontend agents work at the same time in separate checkouts, and stacked PRs carry dependent work.
- **Token efficiency:**
  - scripts instead of manual multi-step work
  - MCP tools for docs lookup (Context7), GitHub (`gh`) and Render deploys
  - agents run only targeted checks locally
  - the `.md` files agents load are trimmed from time to time

## CI is the gate, not the AI's word

- GitHub Actions runs on every PR:
  - peers check, typecheck, lint
  - unit tests and API e2e tests
  - the web build
  - a stale-schema check
  - **Playwright**: the clinician demo by keyboard only, in German
  - **axe**: accessibility scans in light and dark mode
- Agents push, watch `gh pr checks`, and fix until the PR is green. I review and merge.
- **Small PRs** with 1–3 bullet descriptions. [PROGRESS.md](PROGRESS.md) records what was done, what's next, bugs, fixes and suggestions, so each session starts where the last ended.

## What went wrong, and how it was caught

| Problem | Caught by | Fix |
|---|---|---|
| The AI assumed clinicians say "Visits", not "Encounters" | I questioned it; a research agent checked Epic and gematik ISiK | EHR wording in both languages |
| A stacked PR was merged into its base branch, so the change never reached `main` | Checking `main` after the merge | A follow-up PR, plus auto-delete of merged branches so stacks retarget |
| Agent worktree isolation failed on Windows (`d:` vs `D:` paths) | The tool refused to run | Manual worktrees outside the repo |
| A hand-created Render service used `yarn` and failed on every push | Render build logs, read through MCP | Infrastructure as code: `render.yaml` |
| Hard-coded service URLs broke when Render assigned a new random suffix | Comparing the Blueprint plan with `render.yaml` | Cross-service URLs set once (`sync: false`) |
| The theme's chart colours were all grey, so the lines read as disabled | Agent report review | The app's clinical accent token |
| A CI job hung after all tests passed: the `pnpm` wrappers around the test servers never exited | Reading the job log | Plain `node` processes in CI, plus job and step timeouts |
| Light-mode grey text was at 4.34:1 contrast, under WCAG AA | The axe browser test | Muted text token adjusted to 4.98:1 |
| A flaky focus test | CI | Fixed before merge |

**Lessons:** I decide the product. The AI writes code fastest when the spec is precise. Every claim gets verified by CI, tests or a check I run myself.
