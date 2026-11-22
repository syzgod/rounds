import { MockedProvider } from "@apollo/client/testing/react"
import type { MockLink } from "@apollo/client/testing"
import { print } from "graphql"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { cloneElement, type ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { PatientTrends } from "@/components/patient-trends"
import { PATIENT_TRENDS_QUERY, type Trend } from "@/graphql/trends"
import type { Locale } from "@/i18n/messages"
import { TestLocale } from "@/test/i18n"

// jsdom has no layout, so ResponsiveContainer renders nothing; give charts a fixed size.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>()
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>
    }) => cloneElement(children, { width: 480, height: 200 }),
  }
})

const HBA1C: Trend = {
  __typename: "Trend",
  id: "trend-4548-4",
  code: "4548-4",
  title: "Hemoglobin A1c",
  unit: "%",
  referenceLow: 4,
  referenceHigh: 5.6,
  secondaryReferenceLow: null,
  secondaryReferenceHigh: null,
  points: [
    {
      __typename: "TrendPoint",
      id: "p1",
      date: "2023-03-14",
      value: 7.8,
      secondaryValue: null,
      flag: "HIGH",
    },
    {
      __typename: "TrendPoint",
      id: "p2",
      date: "2024-03-14",
      value: 7.1,
      secondaryValue: null,
      flag: null,
    },
    {
      __typename: "TrendPoint",
      id: "p3",
      date: "2025-06-17",
      value: 6.6,
      secondaryValue: null,
      flag: "HIGH",
    },
  ],
}

const BP: Trend = {
  __typename: "Trend",
  id: "trend-85354-9",
  code: "85354-9",
  title: "Blood pressure",
  unit: "mmHg",
  referenceLow: 90,
  referenceHigh: 120,
  secondaryReferenceLow: 60,
  secondaryReferenceHigh: 80,
  points: [
    {
      __typename: "TrendPoint",
      id: "b1",
      date: "2024-01-09T14:35:00Z",
      value: 142,
      secondaryValue: 90,
      flag: null,
    },
    {
      __typename: "TrendPoint",
      id: "b2",
      date: "2025-02-03T09:00:00Z",
      value: 128,
      secondaryValue: 82,
      flag: null,
    },
  ],
}

function mock(trends: Trend[]): MockLink.MockedResponse {
  return {
    request: { query: PATIENT_TRENDS_QUERY, variables: { id: "p-1" } },
    result: { data: { patient: { __typename: "Patient", id: "p-1", trends } } },
  }
}

function renderTrends(
  mocks: ReadonlyArray<MockLink.MockedResponse>,
  locale: Locale = "en"
) {
  render(
    <TestLocale locale={locale}>
      <MockedProvider mocks={mocks}>
        <PatientTrends patientId="p-1" />
      </MockedProvider>
    </TestLocale>
  )
}

describe("PatientTrends", () => {
  it("shows skeleton cards while loading", () => {
    renderTrends([mock([HBA1C])])
    expect(screen.getByRole("heading", { name: "Trends" })).toBeInTheDocument()
    expect(screen.getByLabelText("Loading trends")).toHaveAttribute(
      "aria-busy",
      "true"
    )
  })

  it("renders cards with latest values, dates and flag in English", async () => {
    renderTrends([mock([HBA1C, BP])])
    const items = await screen.findAllByRole("listitem")
    expect(items).toHaveLength(2)
    const hba1c = items[0]!
    expect(within(hba1c).getByText("HbA1c")).toBeInTheDocument()
    expect(within(hba1c).getByText("6.6 %")).toBeInTheDocument()
    expect(within(hba1c).getByText("17 Jun 2025")).toBeInTheDocument()
    expect(within(hba1c).getByText("High")).toBeInTheDocument()
    const bp = items[1]!
    expect(within(bp).getByText("Blood pressure")).toBeInTheDocument()
    expect(within(bp).getByText("128/82 mmHg")).toBeInTheDocument()
  })

  it("localizes titles, decimals and dates in German", async () => {
    renderTrends([mock([HBA1C, BP])], "de")
    await screen.findAllByRole("listitem")
    expect(
      screen.getByRole("heading", { name: "Messwerte" })
    ).toBeInTheDocument()
    expect(screen.getByText("6,6 %")).toBeInTheDocument()
    expect(screen.getByText("17.06.2025")).toBeInTheDocument()
    expect(screen.getByText("Blutdruck")).toBeInTheDocument()
    expect(screen.getByText("Erhöht")).toBeInTheDocument()
    expect(screen.getByText("128/82 mmHg")).toBeInTheDocument()
  })

  it("shows min, max, date span and the norm footer without hovering", async () => {
    renderTrends([mock([HBA1C, BP])])
    const [hba1c, bp] = await screen.findAllByRole("listitem")
    expect(within(hba1c!).getByText("Mar 2023 – Jun 2025")).toBeInTheDocument()
    expect(within(hba1c!).getByText("Normal 4.0–5.6 %")).toBeInTheDocument()
    expect(within(hba1c!).getByText("7.8")).toBeInTheDocument()
    expect(
      within(hba1c!).getByText("6.6", { selector: "text *" })
    ).toBeInTheDocument()
    expect(hba1c!.querySelector(".recharts-reference-area")).not.toBeNull()
    expect(
      within(bp!).getByText("Normal 90–120/60–80 mmHg")
    ).toBeInTheDocument()
  })

  it("localizes the norm footer and date span in German", async () => {
    renderTrends([mock([HBA1C])], "de")
    expect(await screen.findByText("Norm 4,0–5,6 %")).toBeInTheDocument()
    expect(screen.getByText("03.2023 – 06.2025")).toBeInTheDocument()
  })

  it("omits band and footer when there is no range", async () => {
    const noRange: Trend = {
      ...HBA1C,
      referenceLow: null,
      referenceHigh: null,
    }
    renderTrends([mock([noRange])])
    const [item] = await screen.findAllByRole("listitem")
    expect(item!.querySelector(".recharts-reference-area")).toBeNull()
    expect(within(item!).queryByText(/^Normal /)).not.toBeInTheDocument()
  })

  it("opens Details by keyboard with a dated table and returns focus on Escape", async () => {
    const user = userEvent.setup()
    renderTrends([mock([HBA1C, BP])])
    const button = (
      await screen.findAllByRole("button", { name: /^Details/ })
    )[0]!
    expect(button).toHaveAccessibleName("Details: HbA1c")
    button.focus()
    await user.keyboard("{Enter}")
    const dialog = await screen.findByRole("dialog", { name: "HbA1c" })
    const table = within(dialog).getByRole("table")
    const rows = within(table).getAllByRole("row").slice(1)
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getByText("17 Jun 2025")).toBeInTheDocument()
    expect(within(rows[0]!).getByText("6.6 %")).toBeInTheDocument()
    expect(within(rows[0]!).getByText("High")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("—")).toBeInTheDocument()
    expect(
      within(dialog).getByText("Normal range: 4.0–5.6 %")
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Normal range")).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it("shows em dash when no range and a legend for blood pressure", async () => {
    const user = userEvent.setup()
    renderTrends(
      [
        mock([
          {
            ...BP,
            referenceLow: null,
            referenceHigh: null,
            secondaryReferenceLow: null,
            secondaryReferenceHigh: null,
          },
        ]),
      ],
      "de"
    )
    await user.click(await screen.findByRole("button", { name: /^Details/ }))
    const dialog = await screen.findByRole("dialog", { name: "Blutdruck" })
    expect(within(dialog).getByText("Systolisch")).toBeInTheDocument()
    expect(within(dialog).getByText("Diastolisch")).toBeInTheDocument()
    expect(within(dialog).getAllByText("—")).toHaveLength(2)
    expect(
      within(dialog).getByRole("columnheader", { name: "Bewertung" })
    ).toBeInTheDocument()
  })

  it("gives each chart a text alternative", async () => {
    renderTrends([mock([HBA1C])])
    expect(
      await screen.findByText(
        "HbA1c, 3 values from 14 Mar 2023 to 17 Jun 2025, latest 6.6 %, range 6.6–7.8 %"
      )
    ).toBeInTheDocument()
  })

  it("falls back to the API title for unknown codes", async () => {
    renderTrends([mock([{ ...HBA1C, code: "0000-0", title: "Mystery" }])])
    expect(await screen.findByText("Mystery")).toBeInTheDocument()
  })

  it("renders nothing for a patient without trends", async () => {
    renderTrends([mock([])])
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("shows a one-line error and refetches on Retry", async () => {
    const user = userEvent.setup()
    renderTrends([
      {
        request: { query: PATIENT_TRENDS_QUERY, variables: { id: "p-1" } },
        error: new Error("boom"),
      },
      mock([HBA1C]),
    ])
    expect(await screen.findByText("Couldn't load trends.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText("6.6 %")).toBeInTheDocument()
  })

  it("toggles by keyboard, flips aria-expanded and shows a hint", async () => {
    const user = userEvent.setup()
    renderTrends([mock([HBA1C, BP])])
    await screen.findAllByRole("listitem")
    const button = screen.getByRole("button", { name: "Hide" })
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(button).toHaveAttribute("aria-controls")
    button.focus()
    await user.keyboard("{Enter}")
    const show = screen.getByRole("button", { name: "Show" })
    expect(show).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    expect(screen.getByText("2 measurements hidden")).toBeInTheDocument()
    await user.keyboard(" ")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute(
      "aria-expanded",
      "true"
    )
  })

  it("persists the choice across remounts", async () => {
    const user = userEvent.setup()
    renderTrends([mock([HBA1C])])
    await user.click(await screen.findByRole("button", { name: "Hide" }))
    expect(window.localStorage.getItem("trends-visible")).toBe("false")
    cleanup()
    renderTrends([mock([HBA1C])])
    expect(await screen.findByRole("button", { name: "Show" })).toHaveAttribute(
      "aria-expanded",
      "false"
    )
    expect(screen.getByText("1 measurement hidden")).toBeInTheDocument()
  })

  it("ignores unknown stored values and pluralizes in German", async () => {
    window.localStorage.setItem("trends-visible", "maybe")
    renderTrends([mock([HBA1C])], "de")
    expect(
      await screen.findByRole("button", { name: "Ausblenden" })
    ).toBeInTheDocument()
    cleanup()
    window.localStorage.setItem("trends-visible", "false")
    renderTrends([mock([HBA1C, BP])], "de")
    expect(
      await screen.findByText("2 Messwerte ausgeblendet")
    ).toBeInTheDocument()
    cleanup()
    renderTrends([mock([HBA1C])], "de")
    expect(
      await screen.findByText("1 Messwert ausgeblendet")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Einblenden" })
    ).toBeInTheDocument()
  })

  it("never selects rawJson", () => {
    expect(print(PATIENT_TRENDS_QUERY)).not.toContain("rawJson")
  })
})
