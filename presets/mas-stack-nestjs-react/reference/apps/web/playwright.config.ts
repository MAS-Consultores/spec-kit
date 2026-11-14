import net from "node:net";
import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not bind a free port"));
        return;
      }
      const port = address.port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

const apiPort = await freePort();
const webPort = await freePort();
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
      env: { ...process.env, CI: "true" },
    },
  ],
};

export default defineConfig(config);
