import { MockedProvider } from "@apollo/client/testing/react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AppHeader } from "@/components/app-header"
import { HEALTH_QUERY } from "@/components/health-status"
import { PatientSummaryPanel } from "@/components/patient-summary"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PATIENT_QUERY } from "@/graphql/patients"
import { PATIENT_TIMELINE_QUERY } from "@/graphql/timeline"
import { detectLocale } from "@/i18n/messages"
import { TestLocale } from "@/test/i18n"
import { PATIENTS } from "@/test/patients.fixtures"

const amelia = PATIENTS[0]
if (!amelia) throw new Error("fixture missing")

const mocks = [
  { request: { query: HEALTH_QUERY }, result: { data: { health: "ok" } } },
  {
    request: { query: PATIENT_QUERY, variables: { id: amelia.id } },
    result: { data: { patient: amelia } },
  },
  {
    request: { query: PATIENT_TIMELINE_QUERY, variables: { id: amelia.id } },
    result: {
      data: {
        patient: {
          __typename: "Patient",
          id: amelia.id,
          timeline: [
            {
              __typename: "TimelineEvent",
              id: "Condition/cond-t2dm",
              kind: "CONDITION",
              date: "2019-05-02",
              endDate: null,
              title: "Type 2 diabetes mellitus",
              detail: null,
              category: "Problem list item",
              status: "active",
              flag: null,
            },
            {
              __typename: "TimelineEvent",
              id: "Condition/cond-odd",
              kind: "CONDITION",
              date: "2018-01-01",
              endDate: null,
              title: "Odd status",
              detail: null,
              category: null,
              status: "some-new-code",
              flag: null,
            },
          ],
        },
      },
    },
  },
]

function renderApp() {
  render(
    <TestLocale locale="en">
      <MockedProvider mocks={mocks}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <AppHeader />
            <PatientSummaryPanel
              patientId={amelia.id}
              onClearSelection={vi.fn()}
            />
          </TooltipProvider>
        </ThemeProvider>
      </MockedProvider>
    </TestLocale>
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

afterEach(() => {
  document.documentElement.lang = ""
  vi.unstubAllGlobals()
})

describe("language switch", () => {
  it("switches the UI to German from the header, by keyboard", async () => {
    const user = renderApp()
    await screen.findByText("10 Dec 1985")
    expect(await screen.findByText("Online")).toBeInTheDocument()
    const group = screen.getByRole("group", { name: "Language" })
    const english = within(group).getByRole("button", { name: "English" })
    const german = within(group).getByRole("button", { name: "Deutsch" })
    expect(english).toHaveAttribute("aria-pressed", "true")
    expect(document.documentElement.lang).toBe("en")

    english.focus()
    await user.keyboard("{ArrowRight}")
    expect(german).toHaveFocus()
    await user.keyboard(" ")

    expect(german).toHaveAttribute("aria-pressed", "true")
    expect(document.documentElement.lang).toBe("de")
    expect(window.localStorage.getItem("locale")).toBe("de")
    expect(screen.getByText("10.12.1985")).toBeInTheDocument()
    expect(screen.getByText("Geburtsdatum")).toBeInTheDocument()
    expect(screen.getByText("Patientennummer")).toBeInTheDocument()
    expect(screen.getByText("Weiblich")).toBeInTheDocument()
    expect(screen.getByText(/^\d+ J\.$/)).toBeInTheDocument()

    const filters = await screen.findByRole("group", {
      name: "Verlauf nach Art filtern",
    })
    expect(
      within(filters).getByRole("button", { name: /^Alle/ })
    ).toBeInTheDocument()
    expect(
      within(filters).getByRole("button", { name: /^Diagnosen/ })
    ).toBeInTheDocument()
    expect(
      within(filters).getByRole("button", { name: /^Kontakte/ })
    ).toBeTruthy()
    expect(
      within(filters).getByRole("button", { name: /^Befunde/ })
    ).toBeTruthy()
    expect(screen.getByText("Aktiv")).toBeInTheDocument()
    // Unknown status codes fall back to the sentence-cased code.
    expect(screen.getByText("Some-new-code")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "02.05.2019" })
    ).toBeInTheDocument()
  })

  it("keeps the active language when pressed again", async () => {
    const user = renderApp()
    const english = screen.getByRole("button", { name: "English" })
    await user.click(english)
    expect(english).toHaveAttribute("aria-pressed", "true")
  })
})

describe("detectLocale", () => {
  it("uses the browser language unless a choice was saved", () => {
    vi.stubGlobal("navigator", { language: "de-AT" })
    expect(detectLocale()).toBe("de")
    vi.stubGlobal("navigator", { language: "fr-FR" })
    expect(detectLocale()).toBe("en")
    window.localStorage.setItem("locale", "de")
    expect(detectLocale()).toBe("de")
    window.localStorage.setItem("locale", "xx")
    expect(detectLocale()).toBe("en")
  })
})
