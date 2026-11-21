import { GraphQLError } from "graphql"
import { MockedProvider } from "@apollo/client/testing/react"
import type { MockLink } from "@apollo/client/testing"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HEALTH_QUERY, HealthStatus } from "@/components/health-status"

function renderWithMocks(mocks: ReadonlyArray<MockLink.MockedResponse>) {
  return render(
    <MockedProvider mocks={mocks}>
      <HealthStatus />
    </MockedProvider>
  )
}

describe("HealthStatus", () => {
  it("shows a loading state, then connected when health is ok", async () => {
    renderWithMocks([
      { request: { query: HEALTH_QUERY }, result: { data: { health: "ok" } } },
    ])

    expect(screen.getByRole("status")).toHaveTextContent("Checking API…")
    expect(await screen.findByText("API connected")).toBeInTheDocument()
  })

  it("shows unreachable and a retry button on a network error", async () => {
    renderWithMocks([
      { request: { query: HEALTH_QUERY }, error: new Error("Failed to fetch") },
    ])

    expect(await screen.findByText("API unreachable")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled()
  })

  it("surfaces the GraphQL error message", async () => {
    renderWithMocks([
      {
        request: { query: HEALTH_QUERY },
        result: { errors: [new GraphQLError("Schema not ready")] },
      },
    ])

    expect(await screen.findByText("Schema not ready")).toBeInTheDocument()
  })
})
