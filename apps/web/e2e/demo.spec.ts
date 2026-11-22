import { expect, test, type Locator, type Page } from "@playwright/test"

/** Tab forward until the locator has focus (keyboard-only navigation). */
async function tabTo(page: Page, target: Locator, maxTabs = 60) {
  for (let i = 0; i < maxTabs; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press("Tab")
  }
  await expect(target).toBeFocused()
}

async function openPatient(page: Page, query: string, name: RegExp) {
  await page.keyboard.press("/")
  const search = page.getByRole("combobox", {
    name: "Patienten nach Name oder Patientennummer suchen",
  })
  await expect(search).toBeFocused()
  await page.keyboard.type(query)
  const option = page.getByRole("option", { name })
  await expect(option).toHaveCount(1)
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  return option
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  // Wait for the directory to load before driving the keyboard.
  await expect(page.getByRole("option").first()).toBeVisible()
})

test("clinician demo works by keyboard alone, in German", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "de")
  await expect(
    page.getByRole("heading", { name: "Rounds", level: 1 })
  ).toBeVisible()

  // Search with "/" and narrow the list.
  const total = await page.getByRole("option").count()
  expect(total).toBeGreaterThan(1)
  const row = await openPatient(page, "Amelia", /Amelia/)
  await expect(row).toContainText("auffällig")
  await expect(page).toHaveURL(/\?patient=pat-amelia-hartwell$/)

  // Triage header and trends.
  await expect(
    page.getByRole("heading", { name: "Amelia Rose Hartwell" })
  ).toBeVisible()
  const diagnoses = page.getByRole("heading", { name: "Aktive Diagnosen" })
  await expect(diagnoses).toBeVisible()
  await expect(diagnoses.locator("xpath=following-sibling::p")).not.toHaveText(
    "Keine"
  )
  const trends = page.getByRole("region", { name: "Messwerte" })
  await expect(trends).toBeVisible()
  await expect(trends.getByText("HbA1c").first()).toBeVisible()
  await expect(trends.getByText("Blutdruck").first()).toBeVisible()
  await expect(trends.getByText(/\/\d+.*mmHg/).first()).toBeVisible()

  // Trend detail dialog: open with Enter, close with Escape, focus returns.
  const details = trends.getByRole("button", { name: "Details: HbA1c" })
  await tabTo(page, details)
  await page.keyboard.press("Enter")
  const detail = page.getByRole("dialog", { name: "HbA1c" })
  await expect(detail).toBeVisible()
  await expect(detail.getByRole("table")).toBeVisible()
  await expect(detail).toContainText("Normbereich")
  await page.keyboard.press("Escape")
  await expect(detail).toBeHidden()
  await expect(details).toBeFocused()

  // Timeline filter: arrow keys + Space.
  const count = page.getByRole("status").filter({ hasText: /Einträge/ })
  await expect(count).toHaveText(/^\d+ Einträge$/)
  const filter = page.getByRole("group", { name: "Verlauf nach Art filtern" })
  const all = filter.getByRole("button", { name: /^Alle/ })
  await tabTo(page, all)
  await page.keyboard.press("ArrowRight") // Kontakte
  await page.keyboard.press("ArrowRight") // Diagnosen
  await page.keyboard.press("ArrowRight") // Befunde
  const findings = filter.getByRole("button", { name: /^Befunde/ })
  await expect(findings).toBeFocused()
  await page.keyboard.press("Space")
  await expect(findings).toHaveAttribute("aria-pressed", "true")
  await expect(count).toHaveText(/^\d+ von \d+ Einträgen$/)

  // Raw FHIR dialog: open with Enter, close with Escape, focus returns.
  const open = page.getByRole("button", {
    name: "FHIR-Rohdaten anzeigen",
    exact: true,
  })
  await tabTo(page, open)
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "FHIR-Quelldaten" })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('"resourceType": "Patient"')
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(open).toBeFocused()

  // "d" toggles dark mode (focus is on a button, not an input).
  const html = page.locator("html")
  const wasDark = await html.evaluate((el) => el.classList.contains("dark"))
  await page.keyboard.press("d")
  await expect(html).toHaveClass(wasDark ? /light/ : /dark/)
})

test("minimal patient shows an empty record without trends", async ({
  page,
}) => {
  await openPatient(page, "Okafor", /Okafor/)
  await expect(
    page.getByRole("heading", { name: "Aktive Diagnosen" })
  ).toBeVisible()
  await expect(page.getByText("Keine Einträge")).toBeVisible()
  await expect(page.getByRole("region", { name: "Messwerte" })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Messwerte" })).toHaveCount(0)
})
