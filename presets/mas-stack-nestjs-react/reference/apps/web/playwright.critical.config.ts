import { defineConfig } from "@playwright/test";

const fixedDate = "2026-01-15";

export default defineConfig({
  testDir: "./e2e/critical",
  retries: 2,
  timeout: 30_000,
  use: {
    screenshot: "off",
    video: "off",
    trace: "off",
    timezoneId: "UTC",
    locale: "es-CL",
  },
  metadata: { fixedDate },
});
