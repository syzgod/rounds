import { MockedProvider } from "@apollo/client/testing/react"
import type { MockLink } from "@apollo/client/testing"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { print } from "graphql"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SourceDialog } from "@/components/source-dialog"
import { PATIENT_QUERY, PATIENTS_QUERY } from "@/graphql/patients"
import {
  PATIENT_SOURCE_QUERY,
  TIMELINE_EVENT_SOURCE_QUERY,
} from "@/graphql/source"
import { PATIENT_TIMELINE_QUERY } from "@/graphql/timeline"
import { PATIENT_TRENDS_QUERY } from "@/graphql/trends"
import { TestLocale } from "@/test/i18n"

const RAW = JSON.stringify({ resourceType: "Patient", id: "pat-1" })
const PRETTY = JSON.stringify(JSON.parse(RAW), null, 2)

const patientMock: MockLink.MockedResponse = {
  request: { query: PATIENT_SOURCE_QUERY, variables: { id: "pat-1" } },
  result: {
    data: { patient: { __typename: "Patient", id: "pat-1", rawJson: RAW } },
  },
}

const eventMock: MockLink.MockedResponse = {
  request: {
    query: TIMELINE_EVENT_SOURCE_QUERY,
    variables: { id: "Observation/obs-1" },
  },
  result: {
    data: {
      timelineEvent: {
        __typename: "TimelineEvent",
        id: "Observation/obs-1",
        rawJson: JSON.stringify({ resourceType: "Observation" }),
      },
    },
  },
}

function renderPatientDialog(
  mocks: ReadonlyArray<MockLink.MockedResponse> = [patientMock],
  locale: "en" | "de" = "en"
) {
  render(
    <TestLocale locale={locale}>
      <MockedProvider mocks={mocks}>
        <SourceDialog
          target={{ kind: "patient", id: "pat-1" }}
          name="Amelia Hartwell"
          label={locale === "en" ? "View FHIR JSON" : "FHIR-Rohdaten anzeigen"}
          variant="outline"
          size="sm"
        />
      </MockedProvider>
    </TestLocale>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("SourceDialog", () => {
  it("opens from the keyboard and shows the pretty-printed JSON", async () => {
    const user = userEvent.setup()
    renderPatientDialog()

    await user.tab()
    const trigger = screen.getByRole("button", { name: "View FHIR JSON" })
    expect(trigger).toHaveFocus()
    await user.keyboard("{Enter}")

    const dialog = await screen.findByRole("dialog", { name: "FHIR source" })
    expect(dialog).toHaveTextContent("Patient · Amelia Hartwell")
    await waitFor(() =>
      expect(dialog.querySelector("pre")?.textContent).toBe(PRETTY)
    )
  })

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup()
    renderPatientDialog()

    const trigger = screen.getByRole("button", { name: "View FHIR JSON" })
    trigger.focus()
    await user.keyboard("{Enter}")
    await screen.findByRole("dialog")
    await screen.findByText(/"resourceType"/)

    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(trigger).toHaveFocus()
  })

  it("traps focus inside the open dialog", async () => {
    const user = userEvent.setup()
    renderPatientDialog()

    await user.click(screen.getByRole("button", { name: "View FHIR JSON" }))
    const dialog = await screen.findByRole("dialog")
    await screen.findByText(/"resourceType"/)

    for (let i = 0; i < 6; i += 1) {
      await user.tab()
      const active = document.activeElement
      // Base UI's focus guards bounce focus straight back into the popup.
      const inside =
        active !== null &&
        (dialog.contains(active) ||
          active.hasAttribute("data-base-ui-focus-guard"))
      expect(inside).toBe(true)
    }
  })

  it("copies the formatted JSON and announces it", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn<(text: string) => Promise<void>>(() =>
      Promise.resolve()
    )
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    renderPatientDialog()

    await user.click(screen.getByRole("button", { name: "View FHIR JSON" }))
    await user.click(await screen.findByRole("button", { name: "Copy" }))

    expect(writeText).toHaveBeenCalledWith(PRETTY)
    expect(await screen.findByRole("status")).toHaveTextContent("Copied")
  })

  it("shows German strings", async () => {
    const user = userEvent.setup()
    renderPatientDialog([patientMock], "de")

    await user.click(
      screen.getByRole("button", { name: "FHIR-Rohdaten anzeigen" })
    )
    expect(
      await screen.findByRole("dialog", { name: "FHIR-Quelldaten" })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Kopieren" })
    ).toBeInTheDocument()
  })

  it("shows a one-line error with Retry that recovers", async () => {
    const user = userEvent.setup()
    renderPatientDialog([
      { ...patientMock, result: undefined, error: new Error("boom") },
      patientMock,
    ])

    await user.click(screen.getByRole("button", { name: "View FHIR JSON" }))
    expect(
      await screen.findByText("Couldn't load the FHIR source.")
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText(/"resourceType"/)).toBeInTheDocument()
  })

  it("falls back to the raw string when it is not valid JSON", async () => {
    const user = userEvent.setup()
    renderPatientDialog([
      {
        ...patientMock,
        result: {
          data: {
            patient: { __typename: "Patient", id: "pat-1", rawJson: "{oops" },
          },
        },
      },
    ])
    await user.click(screen.getByRole("button", { name: "View FHIR JSON" }))
    expect(await screen.findByText("{oops")).toBeInTheDocument()
  })

  it("loads timeline events by their resource id", async () => {
    const user = userEvent.setup()
    render(
      <TestLocale>
        <MockedProvider mocks={[eventMock]}>
          <SourceDialog
            target={{ kind: "timelineEvent", id: "Observation/obs-1" }}
            name="Blood glucose"
            label="FHIR"
            ariaLabel="View FHIR JSON: Blood glucose"
            variant="ghost"
            size="xs"
          />
        </MockedProvider>
      </TestLocale>
    )

    await user.click(
      screen.getByRole("button", { name: "View FHIR JSON: Blood glucose" })
    )
    expect(
      await screen.findByRole("dialog", { name: "FHIR source" })
    ).toHaveTextContent("Observation · Blood glucose")
    expect(await screen.findByText(/"Observation"/)).toBeInTheDocument()
  })
})

describe("rawJson stays out of list and summary queries", () => {
  it.each([
    ["PATIENTS_QUERY", PATIENTS_QUERY],
    ["PATIENT_QUERY", PATIENT_QUERY],
    ["PATIENT_TIMELINE_QUERY", PATIENT_TIMELINE_QUERY],
    ["PATIENT_TRENDS_QUERY", PATIENT_TRENDS_QUERY],
  ])("%s does not select rawJson", (_name, query) => {
    expect(print(query)).not.toContain("rawJson")
  })

  it("only the source queries select rawJson", () => {
    expect(print(PATIENT_SOURCE_QUERY)).toContain("rawJson")
    expect(print(TIMELINE_EVENT_SOURCE_QUERY)).toContain("rawJson")
  })
})
