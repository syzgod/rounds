import { MockedProvider } from "@apollo/client/testing/react"
import type { MockLink } from "@apollo/client/testing"
import { print } from "graphql"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { PatientTrends } from "@/components/patient-trends"
import { PATIENT_TRENDS_QUERY, type Trend } from "@/graphql/trends"
import type { Locale } from "@/i18n/messages"
import { TestLocale } from "@/test/i18n"

const HBA1C: Trend = {
  __typename: "Trend",
  id: "trend-4548-4",
  code: "4548-4",
  title: "Hemoglobin A1c",
  unit: "%",
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
    expect(within(bp).getByText("Systolic")).toBeInTheDocument()
    expect(within(bp).getByText("Diastolic")).toBeInTheDocument()
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
    expect(screen.getByText("Systolisch")).toBeInTheDocument()
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

  it("never selects rawJson", () => {
    expect(print(PATIENT_TRENDS_QUERY)).not.toContain("rawJson")
  })
})
