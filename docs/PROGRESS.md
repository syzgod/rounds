# Progress log

Kept short. Read this at the start of a session and update it at the end. Milestone details are in [PLAN.md](PLAN.md).

## Last session (2026-11-22)

- Published as a public repo, **Rounds** (github.com/syzgod/rounds). The name comes from ward rounds: patient by patient, reviewing each one's history.
- M3 timeline in the web app (#1). M4 API: `rawJson` and the `timelineEvent(id)` query (#3).
- English/German UI with clinician wording, built from typed dictionaries plus `Intl` dates (#5). Labels: Encounters/Diagnoses/Results, Kontakte/Diagnosen/Befunde.
- CLAUDE.md gained the clinician UX rules, the orchestrator/subagent workflow and the small-PR rule (#2, landing on `main` through #4).

## Open PRs (merge in this order)

1. #4: lands the #2 commits on `main`.
2. #5: English/German UI. It is stacked on #4 and retargets to `main` once #4 merges.
3. Measurement trends API, in progress on `feat/api-trends`.

## Next

1. Charts in the web app, from `Patient.trends`: one small chart each for blood pressure, weight, HbA1c, SpO₂ and so on, using shadcn chart (Recharts). They sit between the patient header and the timeline, and the section is hidden when there are no trends.
2. M4 web: a "View FHIR JSON" / "FHIR-Rohdaten anzeigen" dialog.
3. README with a 3-minute demo script: clinician view first, developer setup second.
4. M5: lint, a coverage pass, and a check of dark mode and keyboard-only use.
5. Trim the `.md` files the agents load.

## Bugs found

- Stacked PR #2 merged into its base branch, not `main`. **Fixed:** #4, and auto-delete of merged branches is now on, so stacked PRs retarget.
- Agent worktree isolation fails on this machine (`d:` vs `D:` paths). **Workaround:** a manual `git worktree add` outside the repo, such as `D:/Developer/Projects/rounds-wt-*`.
- en-GB dates abbreviate September as "Sept". Clinicians expect "Sep". **Open**, minor.
- The theme toggle is an icon-only button, which breaks the new "text labels" rule. **Open.**

## Fixes

- The CLAUDE.md wording example said "Visits", not "Encounters". Research showed Epic uses "Encounters", so it now points to EHR wording in both languages.

## Suggestions

- Chart and observation titles come from the FHIR data and are in English only. Map common LOINC codes to German names in the dictionaries.
- Have a German clinician sanity-check the terms (Verlauf, Befunde, Erhöht/Erniedrigt).
- Later: GraphQL Code Generator instead of hand-written types; reference ranges in charts; an index by subject, or DataLoader, if the data grows.
