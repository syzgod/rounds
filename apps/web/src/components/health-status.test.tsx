import { GraphQLError } from "graphql"
import { MockedProvider } from "@apollo/client/testing/react"
import type { MockLink } from "@apollo/client/testing"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HEALTH_QUERY, HealthStatus } from "@/components/health-status"
import { TestLocale } from "@/test/i18n"

function renderWithMocks(mocks: ReadonlyArray<MockLink.MockedResponse>) {
  return render(
    <TestLocale>
      <MockedProvider mocks={mocks}>
        <HealthStatus />
      </MockedProvider>
    </TestLocale>
  )
}

describe("HealthStatus", () => {
  it("shows a loading state, then connected when health is ok", async () => {
    renderWithMocks([
      { request: { query: HEALTH_QUERY }, result: { data: { health: "ok" } } },
    ])

    expect(screen.getByRole("status")).toHaveTextContent("Connecting…")
    expect(await screen.findByText("Online")).toBeInTheDocument()
  })

  it("shows offline and a retry button on a network error", async () => {
    renderWithMocks([
      { request: { query: HEALTH_QUERY }, error: new Error("Failed to fetch") },
    ])

    expect(await screen.findByText("Offline")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled()
  })

  it("never shows raw GraphQL error text", async () => {
    renderWithMocks([
      {
        request: { query: HEALTH_QUERY },
        result: { errors: [new GraphQLError("Schema not ready")] },
      },
    ])

    expect(await screen.findByText("Offline")).toBeInTheDocument()
    expect(screen.queryByText("Schema not ready")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled()
  })
})
