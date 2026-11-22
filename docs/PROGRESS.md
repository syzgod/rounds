# Progress log

Kept short. Read this at the start of a session and update it at the end. Milestone details are in [PLAN.md](PLAN.md).

## Last session (2026-11-22)

- **Shipped:**
  - M3 timeline and M4 FHIR source viewer
  - English/German UI in clinical wording
  - measurement trends: API plus a compact, collapsible chart strip
  - needs-attention triage: an "abnormal" badge and active diagnoses
- **Quality:**
  - GitHub Actions CI: peers check, typecheck, lint, unit and e2e tests, build, stale-schema check
  - Playwright keyboard-only demo in German, plus axe scans in light and dark mode
  - a WCAG AA contrast fix found by axe
- **Live demo:** https://rounds-web-jsyv.onrender.com, from a Render Blueprint (`render.yaml`) in Frankfurt.
- **Docs:** README with a demo script, PRODUCT.md, AI-WORKFLOW.md.

## Open PRs

- #17: contrast fix. CI is green with the axe light-mode checks re-enabled.
- The docs PR: README, PRODUCT, AI-WORKFLOW, this log and the PLAN status.

## Next

1. A small polish PR with the open bugs below.
2. A coverage pass over the API mappers and services (M5 bullet).
3. Optional: one small write feature, such as acknowledging an abnormal result, with an audit log (see PRODUCT.md, Scope).
4. Trim the `.md` files the agents load.

## Bugs found (open)

- en-GB dates abbreviate September as "Sept". Clinicians expect "Sep".
- The theme toggle is an icon-only button, which breaks the "text labels" rule.
- The shared dialog's close button has a hard-coded English screen-reader label, "Close".
- The main JS chunk is 649 kB (205 kB gzipped), and the build warns about it. Recharts is already split out. Next candidates for splitting are cmdk and the dialog.
- Agent worktree isolation fails on Windows (`d:` vs `D:`). **Workaround:** manual `git worktree add` to `D:/Developer/Projects/rounds-wt-*`.

## Fixed

- A stacked PR merged into its base branch, not `main` (#4). Auto-delete of merged branches is now on.
- The "Visits" wording was replaced by EHR terms after research.
- The Render setup with `yarn` and hard-coded URLs was replaced by the Blueprint, with `sync: false` cross-service URLs.
- The Playwright CI hang: plain `node` servers in CI, plus job and step timeouts.
- Light-mode muted text contrast: 4.34:1 raised to 4.98:1 (#17).

## Suggestions

- Have a German clinician sanity-check the terms (Verlauf, Befunde, Erhöht/Erniedrigt, auffällig).
- GraphQL Code Generator instead of hand-written client types.
- Reference ranges in the charts.
- Index resources by subject, or add DataLoader, if the data grows.
- PR preview deploys on Render. These need the API to accept preview origins for CORS.
