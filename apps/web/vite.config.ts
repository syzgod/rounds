/// <reference types="vitest/config" />
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Libraries the first screen needs, split out so a deploy that changes
        // only app code keeps them cached. No catch-all group: that would pull
        // the lazy chart library (recharts) into the first load.
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
            {
              name: "apollo",
              test: /[\\/]node_modules[\\/](@apollo|@wry|graphql|optimism|rxjs|tslib|zen-observable)[\\/]/,
            },
            {
              name: "ui",
              test: /[\\/]node_modules[\\/](@base-ui|@floating-ui|cmdk|cn|class-variance-authority|lucide-react)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    // Timeline times render in local time; pin it so tests match on every machine.
    env: { TZ: "UTC" },
  },
})
