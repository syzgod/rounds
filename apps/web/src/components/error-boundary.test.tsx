import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ErrorBoundary, ErrorFallback } from "@/components/error-boundary"
import { TestLocale } from "@/test/i18n"

function Broken(): never {
  throw new Error("chunk failed to load")
}

describe("ErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks())

  it("shows the fallback with a Reload button when a child throws", () => {
    // React logs caught render errors; keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <TestLocale>
        <ErrorBoundary
          fallback={<ErrorFallback message="Couldn't load trends." />}
        >
          <Broken />
        </ErrorBoundary>
      </TestLocale>
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load trends.")
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument()
  })

  it("renders its children when nothing throws", () => {
    render(
      <TestLocale>
        <ErrorBoundary fallback={<ErrorFallback />}>
          <p>Vital signs</p>
        </ErrorBoundary>
      </TestLocale>
    )

    expect(screen.getByText("Vital signs")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("uses the generic German message by default", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <TestLocale locale="de">
        <ErrorBoundary fallback={<ErrorFallback />}>
          <Broken />
        </ErrorBoundary>
      </TestLocale>
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ein Fehler ist aufgetreten."
    )
    expect(
      screen.getByRole("button", { name: "Neu laden" })
    ).toBeInTheDocument()
  })
})
