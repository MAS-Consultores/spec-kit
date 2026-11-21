/**
 * Playwright loads this config more than once. A short-lived file shares the
 * chosen ports across those loads. A later run reuses the file only when both
 * ports are free or both servers still answer. A port that is taken and does
 * not answer is discarded so the next run does not attach to a dead listener.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface E2ePorts {
  api: number;
  web: number;
}

function listen(server: net.Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve();
    });
  });
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => {
      resolve();
    });
  });
}

export async function freePort(): Promise<number> {
  const server = net.createServer();
  await listen(server, 0);
  const address = server.address();
  if (address === null || typeof address === "string") {
    await closeServer(server);
    throw new Error("Could not bind a free port");
  }
  const port = address.port;
  await closeServer(server);
  return port;
}

function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const finish = (isOpen: boolean): void => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(isOpen);
    };
    socket.once("connect", () => {
      finish(true);
    });
    socket.once("error", () => {
      finish(false);
    });
  });
}

async function httpOk(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(500) });
    return response.ok;
  } catch (error: unknown) {
    if (error instanceof Error) return false;
    throw error;
  }
}

export async function portsUsable(ports: E2ePorts, ageMs = Number.POSITIVE_INFINITY): Promise<boolean> {
  const isApiUp = await httpOk(`http://127.0.0.1:${String(ports.api)}/api/v1/health`);
  const isWebUp = await httpOk(`http://127.0.0.1:${String(ports.web)}/`);
  if (isApiUp && isWebUp) return true;
  if (isApiUp || isWebUp) return false;
  const isBusy = (await isListening(ports.api)) || (await isListening(ports.web));
  if (isBusy) return false;
  return ageMs < 15_000;
}

function readCached(file: string, freshMs: number, now: number): { ports: E2ePorts; ageMs: number } | undefined {
  if (!existsSync(file)) return undefined;
  const stat = statSync(file);
  const ageMs = now - stat.mtimeMs;
  if (ageMs > freshMs) return undefined;
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "api" in parsed &&
    "web" in parsed &&
    typeof parsed.api === "number" &&
    typeof parsed.web === "number"
  ) {
    return { ports: { api: parsed.api, web: parsed.web }, ageMs };
  }
  return undefined;
}

async function choosePortsOnce(options: {
  file: string;
  freshMs: number;
  now: number;
}): Promise<E2ePorts> {
  const cached = readCached(options.file, options.freshMs, options.now);
  if (cached && (await portsUsable(cached.ports, cached.ageMs))) {
    return cached.ports;
  }
  const ports = { api: await freePort(), web: await freePort() };
  writeFileSync(options.file, JSON.stringify(ports));
  return ports;
}

const PORT_LOCK_TIMEOUT_MS = 5_000;
const PORT_LOCK_RETRY_MS = 15;

async function withPortLock<T>(lockDir: string, body: () => Promise<T>): Promise<T> {
  const started = Date.now();
  for (;;) {
    try {
      mkdirSync(lockDir);
      break;
    } catch (error: unknown) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : "";
      if (code !== "EEXIST") throw error;
      if (Date.now() - started > PORT_LOCK_TIMEOUT_MS) {
        throw new Error("e2e port lock timed out", { cause: error });
      }
      await new Promise((resolve) => {
        setTimeout(resolve, PORT_LOCK_RETRY_MS);
      });
    }
  }
  try {
    return await body();
  } finally {
    rmSync(lockDir, { recursive: true, force: true });
  }
}

export async function choosePorts(options: {
  file: string;
  freshMs?: number;
  now?: number;
  isLocked?: boolean;
}): Promise<E2ePorts> {
  const freshMs = options.freshMs ?? 60_000;
  const now = options.now ?? Date.now();
  const once = (): Promise<E2ePorts> => choosePortsOnce({ file: options.file, freshMs, now });
  if (options.isLocked === false) return once();
  return withPortLock(`${options.file}.lock`, once);
}

async function runSelfTest(): Promise<void> {
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
    throw new Error("reused a dead port");
  }
  const again = await choosePorts({ file, freshMs: 60_000 });
  if (again.api !== chosen.api || again.web !== chosen.web) {
    throw new Error("a fresh free cache was not reused");
  }
  const stale = await choosePorts({ file, freshMs: 60_000, now: Date.now() + 120_000 });
  if (stale.api === chosen.api && stale.web === chosen.web) {
    throw new Error("an expired cache was reused");
  }
  const raceFile = join(dir, "race.json");
  const [unlockedA, unlockedB] = await Promise.all([
    choosePorts({ file: raceFile, isLocked: false }),
    choosePorts({ file: raceFile, isLocked: false }),
  ]);
  if (unlockedA.api === unlockedB.api && unlockedA.web === unlockedB.web) {
    throw new Error("unlocked parallel choosePorts did not diverge");
  }
  rmSync(raceFile, { force: true });
  const [lockedA, lockedB] = await Promise.all([
    choosePorts({ file: raceFile }),
    choosePorts({ file: raceFile }),
  ]);
  if (lockedA.api !== lockedB.api || lockedA.web !== lockedB.web) {
    throw new Error("locked parallel choosePorts returned different ports");
  }
  process.stdout.write("e2e-ports ok\n");
}

if (process.argv.includes("--self-test")) {
  const keepalive = setInterval(() => undefined, 1_000);
  runSelfTest()
    .then(() => {
      clearInterval(keepalive);
      process.exit(0);
    })
    .catch((error: unknown) => {
      clearInterval(keepalive);
      process.stderr.write(`${error instanceof Error ? error.message : "ports self-test failed"}\n`);
      process.exit(1);
    });
}
