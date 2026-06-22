import { defineConfig, devices } from "@playwright/test";

// E2E config. Boots the production server against the local Postgres and runs
// Chromium tests. Requires a seeded DB (npm run db:seed) and DATABASE_URL set.
// Run with: npm run test:e2e
const PORT = Number(process.env.E2E_PORT || 3320);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    headless: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Build is assumed done; start the production server for the run.
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `${baseURL}/login`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
