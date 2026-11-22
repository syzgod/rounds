import { resolve } from "node:path"
import { defineConfig, devices } from "@playwright/test"

const repoRoot = resolve(import.meta.dirname, "../..")

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    locale: "de-DE",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // In CI run real processes (no pnpm wrappers) so Playwright can stop them.
      command: process.env.CI
        ? "node dist/main"
        : "pnpm --filter api run start",
      cwd: process.env.CI ? resolve(repoRoot, "apps/api") : repoRoot,
      url: "http://localhost:3000/",
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
      timeout: 180_000,
    },
    {
      command: process.env.CI
        ? "node node_modules/vite/bin/vite.js preview --port 5173 --strictPort"
        : "pnpm --filter web run dev --port 5173 --strictPort",
      cwd: process.env.CI ? resolve(repoRoot, "apps/web") : repoRoot,
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
      timeout: 120_000,
    },
  ],
})
