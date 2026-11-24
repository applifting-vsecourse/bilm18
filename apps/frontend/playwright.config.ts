import { defineConfig, devices } from "@playwright/test"

// Runs against the app that is already up (`pnpm dev`, seeded database) —
// no webServer here, so it never starts a second instance. In CI the
// test-e2e job (.github/workflows/ci.yml) starts the app the same way first.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  // A stray test.only must not shrink the CI run to one test.
  forbidOnly: !!process.env.CI,
  // The tests share one database; keep them from racing each other.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3050",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
