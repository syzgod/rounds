import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { TextSizeSwitch } from "@/components/text-size-switch"
import { TestLocale } from "@/test/i18n"

describe("TextSizeSwitch", () => {
  afterEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.textSize
  })

  it("applies and saves the chosen size", async () => {
    const user = userEvent.setup()
    render(
      <TestLocale>
        <TextSizeSwitch />
      </TestLocale>
    )

    const large = screen.getByRole("button", { name: "Large text" })
    expect(large).toHaveAttribute("aria-pressed", "false")
    await user.click(large)

    expect(large).toHaveAttribute("aria-pressed", "true")
    expect(document.documentElement.dataset.textSize).toBe("large")
    expect(window.localStorage.getItem("textSize")).toBe("large")
  })

  it("starts from the saved size, with German labels", () => {
    window.localStorage.setItem("textSize", "larger")
    render(
      <TestLocale locale="de">
        <TextSizeSwitch />
      </TestLocale>
    )

    expect(
      screen.getByRole("group", { name: "Schriftgröße" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sehr große Schrift" })
    ).toHaveAttribute("aria-pressed", "true")
  })
})
