import fs from "node:fs";
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

const portFile = new URL("./.e2e-ports.json", import.meta.url);
function readPorts(): { api: number; web: number } | undefined {
  if (!fs.existsSync(portFile)) {
    return undefined;
  }
  if (Date.now() - fs.statSync(portFile).mtimeMs > 60_000) {
    return undefined;
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(portFile, "utf8"));
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "api" in parsed &&
    "web" in parsed &&
    typeof parsed.api === "number" &&
    typeof parsed.web === "number"
  ) {
    return { api: parsed.api, web: parsed.web };
  }
  return undefined;
}
const cached = readPorts();
const apiPort = cached?.api ?? (await freePort());
const webPort = cached?.web ?? (await freePort());
if (!cached) {
  fs.writeFileSync(portFile, JSON.stringify({ api: apiPort, web: webPort }));
}
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
