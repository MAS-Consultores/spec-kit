import { defineConfig } from "@playwright/test";

const fixedDate = "2026-01-15";

export default defineConfig({
  testDir: "./e2e/visual",
  timeout: 30_000,
  retries: 0,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: {
    screenshot: "off",
    video: "off",
    trace: "off",
    timezoneId: "UTC",
    locale: "es-CL",
    contextOptions: { reducedMotion: "reduce" },
  },
  metadata: { fixedDate },
});
