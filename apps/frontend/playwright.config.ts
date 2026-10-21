import { defineConfig, devices } from "@playwright/test"

// Runs against the app that is already up (`pnpm dev`, seeded database) —
// no webServer here, so it never starts a second instance. Not part of CI.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  // The tests share one database; keep them from racing each other.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3050",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
