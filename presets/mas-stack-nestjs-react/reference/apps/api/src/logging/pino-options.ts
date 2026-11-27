import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import pino from "pino";
import { assignRequestId } from "./request-id.js";
import { redactSensitive } from "./redact.js";

const require = createRequire(import.meta.url);

export type LogEnv = {
  LOG_LEVEL: string;
  NODE_ENV: string;
  LOG_FILE: string;
  LOG_FILE_RETENTION_DAYS: number;
};

function rollOptions(file: string, days: number): Record<string, unknown> {
  return { file, frequency: "daily", mkdir: true, limit: { count: days } };
}

type LogMethod = (this: unknown, ...args: unknown[]) => void;

type PinoHttp = {
  level: string;
  customProps: (req: IncomingMessage & { id?: string }) => { requestId: string | undefined };
  genReqId: (req: IncomingMessage, res: ServerResponse) => string;
  hooks: { logMethod: (this: unknown, args: readonly unknown[], method: LogMethod) => void };
  transport?:
    | { target: string; options: Record<string, unknown> }
    | { targets: Array<{ target: string; options: Record<string, unknown> }> };
};

function redactArgs(args: readonly unknown[]): readonly unknown[] {
  const first = args[0];
  if (typeof first === "object" && first !== null) return [redactSensitive(first), ...args.slice(1)];
  return args;
}

export function pinoHttpOptions(env: LogEnv): PinoHttp {
  const base: PinoHttp = {
    level: env.LOG_LEVEL,
    customProps: (req: IncomingMessage & { id?: string }) => ({ requestId: req.id }),
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const raw = req.headers["x-request-id"];
      return assignRequestId(Array.isArray(raw) ? raw[0] : raw, (name, value) => {
        res.setHeader(name, value);
      });
    },
    hooks: {
      logMethod(this: unknown, args: readonly unknown[], method: LogMethod) {
        method.apply(this, [...redactArgs(args)]);
      },
    },
  };
  const file = env.LOG_FILE.trim();
  const pretty = { target: require.resolve("pino-pretty"), options: { ["singleLine"]: true } };
  if (file.length === 0) {
    if (env.NODE_ENV === "production") return base;
    return { ...base, transport: pretty };
  }
  const stdout = env.NODE_ENV === "production"
    ? { target: "pino/file", options: { destination: process.stdout.fd } }
    : pretty;
  const rolled = { target: "pino-roll", options: rollOptions(file, env.LOG_FILE_RETENTION_DAYS) };
  return { ...base, transport: { targets: [stdout, rolled] } };
}

type RollStream = {
  flushSync: () => void;
  end: () => void;
  on: (event: "ready", listener: () => void) => void;
};

/** Escribe una línea JSON ya ocultada. Sin ruta no abre ningún archivo. */
export async function writeRolledLog(env: LogEnv, record: Record<string, unknown>): Promise<void> {
  if (env.LOG_FILE.trim().length === 0) return;
  const open = require("pino-roll") as (options: Record<string, unknown>) => Promise<RollStream>;
  const stream = await open(rollOptions(env.LOG_FILE, env.LOG_FILE_RETENTION_DAYS));
  await new Promise<void>((resolve) => {
    stream.on("ready", () => {
      resolve();
    });
  });
  const logger = pino({
    hooks: {
      logMethod(this: unknown, args: unknown[], method: LogMethod) {
        method.apply(this, [...redactArgs(args)]);
      },
    },
  }, stream as unknown as pino.DestinationStream);
  logger.info(record);
  stream.flushSync();
  stream.end();
}
