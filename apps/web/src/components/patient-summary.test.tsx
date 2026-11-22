import { MockedProvider } from "@apollo/client/testing/react"
import type { MockLink } from "@apollo/client/testing"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PatientDirectory } from "@/components/patient-directory"
import { PatientSummaryPanel } from "@/components/patient-summary"
import {
  PATIENT_QUERY,
  PATIENTS_QUERY,
  type PatientSummary,
} from "@/graphql/patients"
import { createCache } from "@/lib/apollo-client"
import { TestLocale } from "@/test/i18n"
import { PATIENTS } from "@/test/patients.fixtures"

function fixture(id: string): PatientSummary {
  const patient = PATIENTS.find((p) => p.id === id)
  if (!patient) throw new Error(`No fixture ${id}`)
  return patient
}

function patientMock(
  id: string,
  patient: PatientSummary | null
): MockLink.MockedResponse {
  return {
    request: { query: PATIENT_QUERY, variables: { id } },
    result: { data: { patient } },
  }
}

function renderSummary(
  patientId: string,
  mocks: ReadonlyArray<MockLink.MockedResponse>
) {
  const onClearSelection = vi.fn<() => void>()
  render(
    <TestLocale>
      <MockedProvider mocks={mocks}>
        <PatientSummaryPanel
          patientId={patientId}
          onClearSelection={onClearSelection}
        />
      </MockedProvider>
    </TestLocale>
  )
  return { onClearSelection }
}

beforeEach(() => {
  // Freeze "today" only; Apollo's and user-event's timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2025, 5, 15))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("PatientSummaryPanel", () => {
  it("shows a loading state, then the header with formatted facts", async () => {
    const amelia = fixture("pat-amelia-hartwell")
    renderSummary(amelia.id, [patientMock(amelia.id, amelia)])

    expect(screen.getByLabelText("Loading patient")).toBeInTheDocument()
    expect(
      await screen.findByRole("heading", { name: "Amelia Rose Hartwell" })
    ).toBeInTheDocument()
    expect(screen.getByText("Female")).toBeInTheDocument()
    expect(screen.getByText("39 years")).toBeInTheDocument()
    expect(screen.getByText("10 Dec 1985")).toBeInTheDocument()
    expect(screen.getByText("MRN-100001")).toBeInTheDocument()
    expect(screen.getByText("Sex")).toBeInTheDocument()
    // The raw resource id is not shown.
    expect(screen.queryByText(amelia.id)).not.toBeInTheDocument()
  })

  it("labels every missing fact 'Not recorded' for the minimal patient", async () => {
    const okafor = fixture("pat-okafor-minimal")
    renderSummary(okafor.id, [patientMock(okafor.id, okafor)])

    await screen.findByRole("heading", { name: "Okafor" })
    expect(screen.getAllByText("Not recorded")).toHaveLength(4)
  })

  it("shows 'Patient not found' for an unknown id and offers a way back", async () => {
    const { onClearSelection } = renderSummary("nope", [
      patientMock("nope", null),
    ])

    expect(await screen.findByText("Patient not found")).toBeInTheDocument()
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Back to patient list" }))
    expect(onClearSelection).toHaveBeenCalledOnce()
  })

  it("shows an error state with retry", async () => {
    renderSummary("pat-jonah-reyes", [
      {
        request: { query: PATIENT_QUERY, variables: { id: "pat-jonah-reyes" } },
        error: new Error("Failed to fetch"),
      },
    ])

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load this patient."
    )
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled()
  })

  it("renders a directory patient from cache, with no patient(id) request", async () => {
    // Only the list query is mocked: any network request for patient(id) would error.
    const mocks = [
      {
        request: { query: PATIENTS_QUERY },
        result: { data: { patients: PATIENTS } },
      },
    ]
    const cache = createCache()
    const { rerender } = render(
      <TestLocale>
        <MockedProvider cache={cache} mocks={mocks}>
          <PatientDirectory selectedId={null} onSelect={vi.fn()} />
        </MockedProvider>
      </TestLocale>
    )
    await screen.findByText("Jonah Miguel Reyes")

    // Same MockedProvider instance, so the same client and cache.
    rerender(
      <TestLocale>
        <MockedProvider cache={cache} mocks={mocks}>
          <PatientSummaryPanel
            patientId="pat-jonah-reyes"
            onClearSelection={vi.fn()}
          />
        </MockedProvider>
      </TestLocale>
    )

    expect(
      screen.getByRole("heading", { name: "Jonah Miguel Reyes" })
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Loading patient")).not.toBeInTheDocument()
  })
})
