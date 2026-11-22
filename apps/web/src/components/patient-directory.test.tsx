import { MockedProvider } from "@apollo/client/testing/react"
import type { MockLink } from "@apollo/client/testing"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  PatientDirectory,
  filterPatients,
} from "@/components/patient-directory"
import { PATIENTS_QUERY } from "@/graphql/patients"
import { PATIENTS } from "@/test/patients.fixtures"

const ok: MockLink.MockedResponse = {
  request: { query: PATIENTS_QUERY },
  result: { data: { patients: PATIENTS } },
}

function renderDirectory(
  mocks: ReadonlyArray<MockLink.MockedResponse> = [ok],
  selectedId: string | null = null
) {
  const onSelect = vi.fn<(id: string) => void>()
  render(
    <MockedProvider mocks={mocks}>
      <PatientDirectory selectedId={selectedId} onSelect={onSelect} />
    </MockedProvider>
  )
  return { onSelect, user: userEvent.setup() }
}

const options = () => screen.getAllByRole("option")

beforeEach(() => {
  // Ages are computed from "today"; freeze only Date so Apollo's timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2025, 5, 15))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("PatientDirectory", () => {
  it("shows a loading state, then every patient with a count", async () => {
    renderDirectory()

    expect(screen.getByLabelText("Loading patients")).toBeInTheDocument()
    expect(await screen.findByText("Amelia Rose Hartwell")).toBeInTheDocument()
    expect(options()).toHaveLength(4)
    expect(
      screen.getByText("F · 39 y · MRN-100001", { exact: false })
    ).toBeTruthy()
    expect(screen.getByText("No details recorded")).toBeInTheDocument()
    // The live region is debounced (announced once typing pauses).
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("4 patients")
    )
  })

  it("filters by name or MRN as you type", async () => {
    const { user } = renderDirectory()
    const search = await screen.findByRole("combobox", {
      name: "Search patients by name or MRN",
    })
    await screen.findByText("Amelia Rose Hartwell")

    await user.type(search, "pri")
    expect(options()).toHaveLength(1)
    expect(options()[0]).toHaveTextContent("Priya Natarajan")
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("1 of 4 patients")
    )

    await user.clear(search)
    await user.type(search, "100002")
    expect(options()[0]).toHaveTextContent("Jonah Miguel Reyes")

    await user.clear(search)
    await user.type(search, "zzz")
    expect(screen.queryAllByRole("option")).toHaveLength(0)
    expect(screen.getByText("No patients match “zzz”.")).toBeInTheDocument()
  })

  it("selects a patient with the keyboard only: / then ArrowDown then Enter", async () => {
    const { user, onSelect } = renderDirectory()
    await screen.findByText("Amelia Rose Hartwell")

    await user.keyboard("/")
    expect(
      screen.getByRole("combobox", { name: "Search patients by name or MRN" })
    ).toHaveFocus()

    await user.keyboard("{ArrowDown}")
    const highlighted = options().find(
      (option) => option.getAttribute("aria-selected") === "true"
    )
    expect(highlighted).toHaveTextContent("Jonah Miguel Reyes")

    await user.keyboard("{Enter}")
    expect(onSelect).toHaveBeenCalledWith("pat-jonah-reyes")
  })

  it("marks the selected patient", async () => {
    renderDirectory([ok], "pat-priya-natarajan")
    const priya = (await screen.findByText("Priya Natarajan")).closest(
      "[role=option]"
    )
    expect(priya).toHaveAttribute("data-checked", "true")
    expect(priya).toHaveAttribute("aria-selected", "true")
  })

  it("shows an error with a retry button", async () => {
    renderDirectory([
      {
        request: { query: PATIENTS_QUERY },
        error: new Error("Failed to fetch"),
      },
    ])

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Couldn’t load patients")
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeEnabled()
  })
})

describe("filterPatients", () => {
  it("keeps the original order and trims the query", () => {
    expect(filterPatients(PATIENTS, "  a ").map((p) => p.id)).toEqual([
      "pat-amelia-hartwell",
      "pat-jonah-reyes",
      "pat-okafor-minimal",
      "pat-priya-natarajan",
    ])
    expect(filterPatients(PATIENTS, "")).toHaveLength(4)
  })
})
