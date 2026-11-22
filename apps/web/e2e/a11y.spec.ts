import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const SCHEMES = ["light", "dark"] as const
type Scheme = (typeof SCHEMES)[number]

async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  )
  const report = serious
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`
    )
    .join("\n")
  expect(serious, `axe violations:\n${report}`).toEqual([])
}

async function openStart(page: Page, scheme: Scheme) {
  // Theme defaults to "system", so emulate the OS preference.
  await page.emulateMedia({ colorScheme: scheme })
  await page.goto("/")
  await expect(page.getByRole("option").first()).toBeVisible()
  await expect(page.locator("html")).toHaveClass(new RegExp(scheme))
}

async function openAmelia(page: Page, scheme: Scheme) {
  await page.emulateMedia({ colorScheme: scheme })
  await page.goto("/?patient=pat-amelia-hartwell")
  await expect(
    page.getByRole("heading", { name: "Amelia Rose Hartwell" })
  ).toBeVisible()
  await expect(
    page.getByRole("region", { name: "Angeheftete Messwerte" })
  ).toBeVisible()
  await expect(
    page.getByRole("region", { name: "Offene Befunde" })
  ).toBeVisible()
  await expect(page.locator("html")).toHaveClass(new RegExp(scheme))
}

for (const scheme of SCHEMES) {
  test.describe(`axe, ${scheme} mode`, () => {
    test("empty start view", async ({ page }) => {
      await openStart(page, scheme)
      await scan(page)
    })

    test("Amelia's record", async ({ page }) => {
      await openAmelia(page, scheme)
      await scan(page)
    })

    test("Verlauf and Messwerte tabs", async ({ page }) => {
      await openAmelia(page, scheme)
      await page.getByRole("tab", { name: /^Verlauf/ }).click()
      await expect(
        page.getByRole("status").filter({ hasText: /Einträge$/ })
      ).toBeVisible()
      await scan(page)
      await page.getByRole("tab", { name: /^Messwerte/ }).click()
      await expect(
        page.getByRole("searchbox", { name: "Messwerte durchsuchen" })
      ).toBeVisible()
      await scan(page)
    })

    test("source dialog open", async ({ page }) => {
      await openAmelia(page, scheme)
      await page
        .getByRole("button", { name: "FHIR-Rohdaten anzeigen", exact: true })
        .press("Enter")
      const dialog = page.getByRole("dialog", { name: "FHIR-Quelldaten" })
      await expect(dialog).toContainText('"resourceType"')
      await scan(page)
    })
  })
}
