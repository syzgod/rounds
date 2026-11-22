import { MockedProvider } from "@apollo/client/testing/react"
import type { MockLink } from "@apollo/client/testing"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { PatientTimeline, groupByDay } from "@/components/patient-timeline"
import {
  ACKNOWLEDGE_RESULT_MUTATION,
  PATIENT_TIMELINE_QUERY,
  type TimelineEvent,
} from "@/graphql/timeline"
import { TestLocale } from "@/test/i18n"

function event(
  partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "kind">
): TimelineEvent {
  return {
    __typename: "TimelineEvent",
    date: null,
    endDate: null,
    title: partial.id,
    detail: null,
    category: null,
    code: null,
    categoryCode: null,
    status: null,
    flag: null,
    acknowledgedAt: null,
    acknowledgedBy: null,
    needsAcknowledgement: false,
    ...partial,
  }
}

/** A slice of Amelia's timeline (API order: newest first). */
const EVENTS: TimelineEvent[] = [
  event({
    id: "Observation/obs-glucose",
    kind: "OBSERVATION",
    date: "2025-02-03T21:25:00Z",
    title: "Blood glucose",
    detail: "52 mg/dL",
    category: "Laboratory",
    code: "2339-0",
    categoryCode: "laboratory",
    status: "final",
    flag: "LOW",
    needsAcknowledgement: true,
  }),
  event({
    id: "Encounter/enc-er",
    kind: "ENCOUNTER",
    date: "2025-02-03T21:10:00Z",
    endDate: "2025-02-04T01:30:00Z",
    title: "Emergency visit",
    category: "Emergency",
    categoryCode: "EMER",
    status: "finished",
  }),
  event({
    id: "Condition/cond-hypo",
    kind: "CONDITION",
    date: "2025-02-03T21:10:00Z",
    endDate: "2025-02-04T01:30:00Z",
    title: "Hypoglycemia",
    category: "Encounter diagnosis",
    categoryCode: "encounter-diagnosis",
    status: "resolved",
  }),
  event({
    id: "Observation/obs-bp",
    kind: "OBSERVATION",
    date: "2024-01-09T14:35:00Z",
    title: "Blood pressure",
    detail: "142/91 mmHg",
    category: "Vital signs",
    code: "85354-9",
    categoryCode: "vital-signs",
    status: "final",
  }),
  event({
    id: "Condition/cond-t2dm",
    kind: "CONDITION",
    date: "2019-05-02",
    title: "Type 2 diabetes mellitus",
    category: "Problem list item",
    status: "active",
  }),
]

function timelineMock(
  id: string,
  timeline: TimelineEvent[]
): MockLink.MockedResponse {
  return {
    request: { query: PATIENT_TIMELINE_QUERY, variables: { id } },
    result: { data: { patient: { __typename: "Patient", id, timeline } } },
  }
}

function renderTimeline(
  mocks: ReadonlyArray<MockLink.MockedResponse>,
  locale: "en" | "de" = "en"
) {
  render(
    <TestLocale locale={locale}>
      <MockedProvider mocks={mocks}>
        <PatientTimeline patientId="pat-amelia-hartwell" />
      </MockedProvider>
    </TestLocale>
  )
  return userEvent.setup()
}

const items = () => screen.getAllByRole("listitem")
const dayHeadings = () =>
  screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)

describe("PatientTimeline", () => {
  it("shows a loading state, then events grouped by day, newest first", async () => {
    renderTimeline([timelineMock("pat-amelia-hartwell", EVENTS)])

    expect(screen.getByLabelText("Loading timeline")).toBeInTheDocument()
    await screen.findByText("Blood glucose")

    expect(dayHeadings()).toEqual(["3 Feb 2025", "9 Jan 2024", "2 May 2019"])
    const firstDay = screen.getByRole("list", { name: "3 Feb 2025" })
    expect(within(firstDay).getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByRole("status")).toHaveTextContent("5 entries")
  })

  it("shows results, flags, statuses and times", async () => {
    renderTimeline([timelineMock("pat-amelia-hartwell", EVENTS)])
    const glucose = (await screen.findByText("Blood glucose")).closest("li")
    if (!glucose) throw new Error("glucose item not found")

    expect(within(glucose).getByText("52 mg/dL")).toBeInTheDocument()
    expect(within(glucose).getByText("Low")).toBeInTheDocument()
    expect(glucose).toHaveTextContent("Result: Laboratory · 21:25")
    // "final" is the normal state and is not shown as a badge.
    expect(within(glucose).queryByText("Final")).not.toBeInTheDocument()

    const er = screen.getByText("Emergency visit").closest("li")
    expect(er).toHaveTextContent("21:10 – 4 Feb 2025 01:30")

    const hypo = screen.getByText("Hypoglycemia").closest("li")
    expect(hypo).toHaveTextContent("Resolved")
    expect(hypo).toHaveTextContent("Encounter diagnosis · until 4 Feb 2025")

    // A date-only onset is never shifted by time zone.
    expect(
      screen.getByText("Type 2 diabetes mellitus").closest("li")
    ).toHaveTextContent("Active")
  })

  it("translates coded names and categories, and keeps recorded text", async () => {
    renderTimeline([timelineMock("pat-amelia-hartwell", EVENTS)], "de")

    expect(await screen.findByText("Blutzucker")).toBeInTheDocument()
    expect(screen.getByText("Blutdruck")).toBeInTheDocument()
    expect(screen.getByText(/Labor ·/)).toBeInTheDocument()
    expect(screen.getByText(/Notfall ·/)).toBeInTheDocument()
    expect(screen.getByText(/Behandlungsdiagnose/)).toBeInTheDocument()
    // Free text and SNOMED diagnoses stay as recorded.
    expect(screen.getByText("Emergency visit")).toBeInTheDocument()
    expect(screen.getByText("Hypoglycemia")).toBeInTheDocument()
    // No code: the API's category is shown.
    expect(screen.getByText(/Problem list item/)).toBeInTheDocument()
  })

  describe("acknowledging a flagged result", () => {
    afterEach(() => window.localStorage.clear())

    const glucose = EVENTS[0]!
    const ackMock = (initials: string): MockLink.MockedResponse => ({
      request: {
        query: ACKNOWLEDGE_RESULT_MUTATION,
        variables: { id: glucose.id, initials },
      },
      result: {
        data: {
          acknowledgeResult: {
            ...glucose,
            acknowledgedAt: "2026-11-22T14:05:00Z",
            acknowledgedBy: initials,
            needsAcknowledgement: false,
          },
        },
      },
    })

    it("asks for initials once, validates them, then shows who and when", async () => {
      const user = renderTimeline([
        timelineMock("pat-amelia-hartwell", EVENTS),
        ackMock("VB"),
      ])
      // Only the flagged result offers the action.
      const buttons = await screen.findAllByRole("button", {
        name: /^Acknowledge/,
      })
      expect(buttons).toHaveLength(1)
      await user.click(buttons[0]!)

      const dialog = await screen.findByRole("dialog", {
        name: "Your initials",
      })
      const input = within(dialog).getByLabelText("Initials")
      await user.type(input, "1")
      await user.click(within(dialog).getByRole("button", { name: "Confirm" }))
      expect(within(dialog).getByText("Enter 1–8 letters.")).toBeInTheDocument()

      await user.clear(input)
      await user.type(input, "VB{Enter}")
      expect(
        await screen.findByText("Acknowledged · VB · 22 Nov 2026 14:05")
      ).toBeInTheDocument()
      expect(window.localStorage.getItem("initials")).toBe("VB")
    })

    it("uses saved initials without asking", async () => {
      window.localStorage.setItem("initials", "KM")
      const user = renderTimeline(
        [timelineMock("pat-amelia-hartwell", EVENTS), ackMock("KM")],
        "de"
      )
      await user.click(
        await screen.findByRole("button", {
          name: "Kenntnis nehmen: Blutzucker",
        })
      )
      expect(
        await screen.findByText("Kenntnis genommen · KM · 22.11.2026 14:05")
      ).toBeInTheDocument()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("filters by type with the keyboard", async () => {
    const user = renderTimeline([timelineMock("pat-amelia-hartwell", EVENTS)])
    await screen.findByText("Blood glucose")
    const group = screen.getByRole("group", { name: "Filter timeline by type" })
    const all = within(group).getByRole("button", { name: /^All/ })
    expect(all).toHaveAttribute("aria-pressed", "true")

    // Tab into the toggle group, arrow to "Diagnoses", press Space.
    all.focus()
    await user.keyboard("{ArrowRight}{ArrowRight}")
    const conditions = within(group).getByRole("button", {
      name: /^Diagnoses/,
    })
    expect(conditions).toHaveFocus()
    await user.keyboard(" ")

    expect(conditions).toHaveAttribute("aria-pressed", "true")
    expect(items()).toHaveLength(2)
    expect(screen.queryByText("Blood glucose")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("2 of 5 entries")

    // Pressing the active filter again keeps it (single-select, never empty).
    await user.keyboard(" ")
    expect(conditions).toHaveAttribute("aria-pressed", "true")

    await user.click(all)
    expect(items()).toHaveLength(5)
  })

  it("shows the empty state for a patient with no events (minimal patient)", async () => {
    render(
      <TestLocale>
        <MockedProvider mocks={[timelineMock("pat-okafor-minimal", [])]}>
          <PatientTimeline patientId="pat-okafor-minimal" />
        </MockedProvider>
      </TestLocale>
    )

    expect(await screen.findByText("No entries")).toBeInTheDocument()
    expect(screen.queryByRole("group")).not.toBeInTheDocument()
  })

  it("shows an error with retry", async () => {
    renderTimeline([
      {
        request: {
          query: PATIENT_TIMELINE_QUERY,
          variables: { id: "pat-amelia-hartwell" },
        },
        error: new Error("Failed to fetch"),
      },
    ])

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load the timeline."
    )
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled()
  })
})

describe("groupByDay", () => {
  it("groups consecutive days and puts undated events in a final group", () => {
    const groups = groupByDay([
      ...EVENTS,
      event({ id: "Observation/undated", kind: "OBSERVATION" }),
    ])
    expect(groups.map((g) => [g.key, g.events.length])).toEqual([
      ["2025-02-03", 3],
      ["2024-01-09", 1],
      ["2019-05-02", 1],
      ["undated", 1],
    ])
  })
})
