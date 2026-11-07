import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./QA",
  fullyParallel: true,
  reporter: [["html", { outputFolder: "QA/evidence/playwright-report" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on",
    screenshot: "on",
    video: "on",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
