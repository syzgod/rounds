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

## Start here (next session)

1. **Merge #19, then #20.** #19 is the API reference ranges, with lab flags now consistent with them. Triage counts change: Amelia 3, Tomasz 1. #20 is the web chart context, stacked on #19. CI is green on both.
2. **Visual check with the Playwright MCP** (`.mcp.json`), running `pnpm dev` locally or using the live demo. No one has looked at the UI in a real browser yet. Check, in light and dark mode, German and English, and at narrow and wide widths:
   - **Charts:**
     - Do the min/max labels line up when the normal band widens the y-range?
     - Are the dialog and card chart sizes right?
     - Does blood pressure show two bands, a legend and a dashed diastolic line?
     - Are the flag diamonds visible?
   - **Measurement strip:** card density at 3 per row, and the position of "Ausblenden".
   - **Triage:** badge wrapping on narrow rows, warning colour contrast, a long diagnosis list.
   - **Source viewer:** how noisy the "FHIR" row buttons are, the header button on narrow widths, the dialog in dark mode, a real clipboard copy.
3. **Clean up** the leftover worktrees `D:/Developer/Projects/rounds-wt-contrast` and `rounds-wt-ranges` once #19 and #20 are merged.

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
