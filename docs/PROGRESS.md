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

- **Charts revised:** normal ranges, min/max and date labels on the cards, and a "Details" dialog with labelled axes and a value table (#19, #20).

- **Favicon** (#22). #19–#22 are merged into `main`.
- **Branching:** work goes into `develop`. Only `main` deploys to Render.
- **Agent setup:** removed unused skills; added `vercel-react-best-practices` and `vercel-composition-patterns`.

## Start here (next session)

1. **GraphQL Code Generator** for the web query types (today a schema change needs manual type edits).
2. **Clean up** the leftover worktrees `D:/Developer/Projects/rounds-wt-contrast` and `rounds-wt-ranges` (both merged and clean).

## Next

1. Optional: one small write feature, such as acknowledging an abnormal result, with an audit log (see PRODUCT.md, Scope).
2. Trim the `.md` files the agents load.

## Bugs found (open)

- On Windows, stopping a background `pnpm dev` task leaves the API and Vite running on :3000/:5173. A new `pnpm dev` then serves old code (EADDRINUSE). **Workaround:** after stopping, stop the project's processes that still listen on those ports.
- Agent worktree isolation fails on Windows (`d:` vs `D:`). **Workaround:** manual `git worktree add` to `D:/Developer/Projects/rounds-wt-*`.

## Fixed

- Chart dialog: round y-axis ticks, flag diamonds, hover tooltip, and a hovered table row marks its point on the chart.
- German timeline: measurement names, categories and encounter classes are translated from codes (`code`, `categoryCode` on TimelineEvent). Visit names and SNOMED diagnoses stay as recorded.
- Visual check done (dark mode, chart dialog, source viewer, phone/tablet/desktop). Fixed: alert Retry covered German text; JSON overflowed the dialog at 375 px; timeline filters overflowed; offline header overflowed on phones.
- API coverage pass (M5): 51 → 71 unit tests; 99.6% lines, 94.8% branches. Notes for untested branches in PLAN.md.
- Readability: root text grows with the screen (100/112.5/125%), A/A+/A++ text size control, two columns from 1024 px, patient names wrap instead of truncating.
- Bundle: libraries split into react/apollo/ui chunks; app code is 58 kB. No size warning.
- Polish: "Sep" not "Sept"; theme toggle has a text label; dialog close label is translated; header tagline hidden on phones (it overflowed).
- Error boundaries around the chart strip and the app (#24).
- A stacked PR merged into its base branch, not `main` (#4). Auto-delete of merged branches is now on.
- The "Visits" wording was replaced by EHR terms after research.
- The Render setup with `yarn` and hard-coded URLs was replaced by the Blueprint, with `sync: false` cross-service URLs.
- The Playwright CI hang: plain `node` servers in CI, plus job and step timeouts.
- Light-mode muted text contrast: 4.34:1 raised to 4.98:1 (#17).

## Suggestions

- A long diagnosis list is untested: the fixtures have at most 2 active diagnoses.
- Have a German clinician sanity-check the terms (Verlauf, Befunde, Erhöht/Erniedrigt, auffällig, Vitalwerte vs. Vitalzeichen, Behandlungsdiagnose).
- GraphQL Code Generator instead of hand-written client types.
- Index resources by subject, or add DataLoader, if the data grows.
- PR preview deploys on Render. These need the API to accept preview origins for CORS.
