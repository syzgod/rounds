import { MockedProvider } from "@apollo/client/testing/react"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { OpenResults } from "@/components/open-results"
import { PATIENT_TIMELINE_QUERY, type TimelineEvent } from "@/graphql/timeline"
import { TestLocale } from "@/test/i18n"

function event(id: string, needsAcknowledgement: boolean): TimelineEvent {
  return {
    __typename: "TimelineEvent",
    id,
    kind: "OBSERVATION",
    date: "2025-06-17T11:50:00Z",
    endDate: null,
    title: id,
    detail: null,
    category: null,
    code: null,
    categoryCode: null,
    status: "final",
    flag: needsAcknowledgement ? "HIGH" : null,
    acknowledgedAt: null,
    acknowledgedBy: null,
    needsAcknowledgement,
  }
}

function renderOpen(timeline: TimelineEvent[]) {
  render(
    <TestLocale locale="de">
      <MockedProvider
        mocks={[
          {
            request: { query: PATIENT_TIMELINE_QUERY, variables: { id: "p1" } },
            result: {
              data: { patient: { __typename: "Patient", id: "p1", timeline } },
            },
          },
        ]}
      >
        <OpenResults patientId="p1" />
      </MockedProvider>
    </TestLocale>
  )
}

describe("OpenResults", () => {
  it("lists only open results, with the acknowledge action", async () => {
    renderOpen([
      event("Observation/open", true),
      event("Observation/old", false),
    ])
    const section = await screen.findByRole("region", {
      name: "Offene Befunde",
    })
    expect(await within(section).findAllByRole("listitem")).toHaveLength(1)
    // No day headings here, so each row carries its date.
    expect(within(section).getByText(/17\.06\.2025/)).toBeInTheDocument()
    expect(
      within(section).getByRole("button", { name: /^Kenntnis nehmen/ })
    ).toBeInTheDocument()
  })

  it("says so when nothing is open", async () => {
    renderOpen([event("Observation/old", false)])
    expect(await screen.findByText("Keine offenen Befunde")).toBeInTheDocument()
  })
})
