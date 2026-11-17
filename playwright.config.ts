import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 60000,
  expect: { timeout: 10000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    reducedMotion: "reduce",
    colorScheme: "light",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
