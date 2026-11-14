import { fileURLToPath } from "node:url";
import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";
import { choosePorts } from "./e2e/ports";

const ports = await choosePorts({
  file: fileURLToPath(new URL("./.e2e-ports.json", import.meta.url)),
});
const apiPort = ports.api;
const webPort = ports.web;
const databaseUrl = process.env["SEED_DATABASE_URL"] ?? process.env["DATABASE_URL"] ?? "";

const config: PlaywrightTestConfig = {
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://127.0.0.1:${String(webPort)}`,
    screenshot: "off",
    video: "off",
    trace: "off",
  },
  webServer: [
    {
      command: "pnpm --filter @demo/contracts build && pnpm --filter @demo/api start:e2e",
      cwd: "../..",
      url: `http://127.0.0.1:${String(apiPort)}/api/v1/health`,
      timeout: 180_000,
      env: {
        ...process.env,
        PORT: String(apiPort),
        DATABASE_URL: databaseUrl,
      },
    },
    {
      command: `pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port ${String(webPort)} --strictPort`,
      url: `http://127.0.0.1:${String(webPort)}/`,
      timeout: 120_000,
      env: {
        ...process.env,
        CI: "true",
        API_PROXY_TARGET: `http://127.0.0.1:${String(apiPort)}`,
      },
    },
  ],
};

export default defineConfig(config);
