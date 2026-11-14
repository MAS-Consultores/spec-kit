/**
 * Playwright loads this config more than once. A short-lived file shares the
 * chosen ports across those loads. A later run reuses the file only when both
 * ports are free or both servers still answer. A port that is taken and does
 * not answer is discarded so the next run does not attach to a dead listener.
 */
import { writeFileSync, readFileSync, existsSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(undefined));
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve(undefined);
      return;
    }
    server.close(() => resolve(undefined));
  });
}

export async function freePort() {
  const server = net.createServer();
  await listen(server, 0);
  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("Could not bind a free port");
  }
  const port = address.port;
  await closeServer(server);
  return port;
}

function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    server.once("error", () => finish(false));
    server.listen(port, "127.0.0.1", () => {
      setImmediate(() => {
        server.close(() => finish(true));
      });
    });
  });
}

async function httpOk(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(500) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function portsUsable(ports) {
  const apiUp = await httpOk(`http://127.0.0.1:${String(ports.api)}/api/v1/health`);
  const webUp = await httpOk(`http://127.0.0.1:${String(ports.web)}/`);
  if (apiUp && webUp) return true;
  if (apiUp || webUp) return false;
  return (await canBind(ports.api)) && (await canBind(ports.web));
}

function readCached(file, freshMs, now) {
  if (!existsSync(file)) return undefined;
  const stat = statSync(file);
  if (now - stat.mtimeMs > freshMs) return undefined;
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    typeof parsed.api === "number" &&
    typeof parsed.web === "number"
  ) {
    return { api: parsed.api, web: parsed.web };
  }
  return undefined;
}

export async function choosePorts({ file, freshMs = 60_000, now = Date.now() }) {
  const cached = readCached(file, freshMs, now);
  if (cached && (await portsUsable(cached))) {
    return cached;
  }
  const ports = { api: await freePort(), web: await freePort() };
  writeFileSync(file, JSON.stringify(ports));
  return ports;
}

async function selfTest() {
  const keepalive = setInterval(() => undefined, 1_000);
  try {
    await runSelfTest();
  } finally {
    clearInterval(keepalive);
  }
}

async function runSelfTest() {
  const dead = await freePort();
  const holder = net.createServer((socket) => {
    socket.destroy();
  });
  await listen(holder, dead);
  const web = await freePort();
  const dir = mkdtempSync(join(tmpdir(), "e2e-ports-"));
  const file = join(dir, ".e2e-ports.json");
  writeFileSync(file, JSON.stringify({ api: dead, web }));
  const chosen = await choosePorts({ file, freshMs: 60_000 });
  await closeServer(holder);
  if (chosen.api === dead) {
    console.error("reused a dead port");
    process.exit(1);
  }

  const again = await choosePorts({ file, freshMs: 60_000 });
  if (again.api !== chosen.api || again.web !== chosen.web) {
    console.error("a fresh free cache was not reused");
    process.exit(1);
  }
  const stale = await choosePorts({ file, freshMs: 60_000, now: Date.now() + 120_000 });
  if (stale.api === chosen.api && stale.web === chosen.web) {
    console.error("an expired cache was reused");
    process.exit(1);
  }
  console.log("e2e-ports ok");
}

if (process.argv.includes("--self-test")) {
  selfTest().then(
    () => {
      process.exit(0);
    },
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}
