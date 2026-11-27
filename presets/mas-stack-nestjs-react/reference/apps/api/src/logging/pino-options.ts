import type { IncomingMessage, ServerResponse } from "node:http";
import { assignRequestId } from "./request-id.js";
import { redactSensitive } from "./redact.js";

export type LogEnv = {
  LOG_LEVEL: string;
  NODE_ENV: string;
};

type LogMethod = (this: unknown, ...args: unknown[]) => void;

type PinoHttp = {
  level: string;
  customProps: (req: IncomingMessage & { id?: string }) => { requestId: string | undefined };
  genReqId: (req: IncomingMessage, res: ServerResponse) => string;
  hooks: { logMethod: (this: unknown, args: readonly unknown[], method: LogMethod) => void };
  transport?: { target: "pino-pretty"; options: Record<string, boolean> };
};

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
        const first = args[0];
        const next = typeof first === "object" && first !== null ? [redactSensitive(first), ...args.slice(1)] : args;
        method.apply(this, next);
      },
    },
  };
  if (env.NODE_ENV === "production") return base;
  return { ...base, transport: { target: "pino-pretty", options: { ["singleLine"]: true } } };
}
