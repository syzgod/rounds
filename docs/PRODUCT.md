# Product: Rounds

## The problem

FHIR R4 is built for exchanging health data between systems, not for people reading it. A single blood pressure reading is a nested `Observation` with LOINC codes and component arrays. A diagnosis's status is buried in a `CodeableConcept`. A clinician shouldn't have to decode this to answer simple questions: *Is this patient OK? What's active? What changed?*

Rounds turns FHIR data into a record a clinician can read in seconds, and keeps the original data one click away.

## Who it's for

Anyone who checks on patients and needs information about them fast: doctors on a ward round, nurses at a handover, a consultant reviewing a case. Their work is fast-paced and interrupted. **Some users know other clinical systems well, and some have never used one.** So nothing may depend on prior training.

## Two ways of using it

| Mode | Question | What answers it |
|---|---|---|
| **Quick analysis** (seconds) | Who needs attention? What's going on with this patient? | The "abnormal" badge in the patient list, the active diagnoses in the header, and the latest measurements with trend charts. Everything is visible without a click. |
| **Detailed check** (minutes) | What exactly happened, and when? Is the data right? | The timeline grouped by day, a filter by encounters, diagnoses and results, and the original FHIR JSON for every entry. |

## Design principles

1. **Clinical words, not technical ones.** Labels follow what clinicians see in their systems. English uses Encounters, Diagnoses and Results. German uses Kontakte, Diagnosen, Befunde and Patientennummer, terms taken from Epic and the German gematik ISiK profiles after research. Words such as "API" or "FHIR resource" never appear, except in the source viewer.
2. **Key information first, with no clicks.** Triage, diagnoses and the latest values sit at the top.
3. **Minimal by default.** Each view does one obvious thing. Measurements can be collapsed, and the app remembers the choice. Controls have text labels, not icons alone.
4. **Spot problems quickly.** Out-of-range values are flagged in words (Erhöht/Erniedrigt) and in shape (diamond markers on the charts), never by colour alone.
5. **Trust through transparency.** Flattening data loses detail, so the original FHIR resource is always viewable.
6. **Usable by everyone.** It works fully by keyboard, in German and English, in light and dark mode, and to WCAG AA. Automated browser tests check this.

## Scope: what was deliberately left out

| Not built | Why | When it would come |
|---|---|---|
| Editing or writing data | Read-only keeps the risk small. Writes in clinical data need authentication, audit trails, validation and FHIR write semantics. | A natural next step. Start with a small, low-risk write, such as acknowledging an abnormal result, with an audit log. |
| Login and permissions | Out of scope for a demo with synthetic data. | First requirement for real data, through the hospital's single sign-on. |
| AI summaries | Clinical safety: generated text about a patient needs validation and human-in-the-loop design. | Only with a clear safety concept. |
| Tabs, notes, medications, allergies | With two sections, tabs cost more than they save, and an empty "Notes" tab is worse than none. | Tabs come together with more resource types. |
| A real FHIR server or database | Fixtures keep the app free of infrastructure and the tests deterministic. | Only the repository service changes (see ADR-001). |

## How success would be measured

- **Clinician feedback:** does it feel calm and obvious to use, without explanation?
- **Time to spot a problem:** for example, from opening the app to finding the patient with an abnormal latest result, and naming the value.
- **Errors and hesitation:** wrong patient opened, or looking for something that's already on the screen.

## Context

Rounds started as a 3-day MVP to show a modern TypeScript stack (NestJS GraphQL, React with Apollo, FHIR R4) on a real problem in clinical software. It continues as a portfolio project.
