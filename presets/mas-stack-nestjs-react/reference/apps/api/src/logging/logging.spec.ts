import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { emitAudit, setAuditSink, type AuditAction, type AuditEvent } from "./audit-log.js";
import { pinoHttpOptions } from "./pino-options.js";
import { REDACTED, redactSensitive } from "./redact.js";
import { assignRequestId, resolveRequestId } from "./request-id.js";

const knownId = "11111111-1111-4111-8111-111111111111";

function capture(): { lines: string[]; stream: Writable } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { lines, stream };
}

describe("structured logs", () => {
  it("writes one JSON object per line", () => {
    const { lines, stream } = capture();
    const logger = pino({ level: "info" }, stream);
    logger.info({ requestId: knownId, msg: "up" });
    const parsed = JSON.parse(lines[0] ?? "") as { requestId: string };
    expect(parsed.requestId).toBe(knownId);
  });

  it("uses pino-pretty only outside production", () => {
    const dev = pinoHttpOptions({ LOG_LEVEL: "info", NODE_ENV: "development" });
    const prod = pinoHttpOptions({ LOG_LEVEL: "info", NODE_ENV: "production" });
    expect("transport" in dev && dev.transport.target).toBe("pino-pretty");
    expect("transport" in prod).toBe(false);
    expect(dev.level).toBe("info");
  });
});

describe("request id", () => {
  it("keeps a valid incoming id and returns it", () => {
    let sent = "";
    const id = assignRequestId(knownId, (_name, value) => {
      sent = value;
    });
    expect(id).toBe(knownId);
    expect(sent).toBe(knownId);
  });

  it("generates a UUID when the header is missing or invalid", () => {
    expect(resolveRequestId(undefined)).toMatch(/^[0-9a-f-]{36}$/i);
    expect(resolveRequestId("not-a-uuid")).not.toBe("not-a-uuid");
  });
});

describe("redaction", () => {
  it.each(["password", "token", "authorization", "cookie", "set-cookie", "rut", "email", "refreshToken"])(
    "hides %s at any depth",
    (field) => {
      const input = { outer: { list: [{ [field]: "secret-value", keep: "visible" }] } };
      const hidden = redactSensitive(input) as { outer: { list: Array<Record<string, string>> } };
      expect(hidden.outer.list[0]?.[field]).toBe(REDACTED);
      expect(hidden.outer.list[0]?.keep).toBe("visible");
      expect(JSON.stringify(hidden)).not.toContain("secret-value");
    },
  );
});

describe("audit", () => {
  it.each(["login", "login_failed", "roles_changed", "permissions_changed", "delete"] as const)(
    "emits %s with actor, resource, result and requestId",
    (action: AuditAction) => {
      const seen: AuditEvent[] = [];
      setAuditSink((event) => {
        seen.push(event);
      });
      emitAudit({
        actor: "user-1",
        action,
        resource: "session",
        result: action === "login_failed" ? "denied" : "ok",
        requestId: knownId,
        email: "person@example.com",
      });
      expect(seen[0]).toMatchObject({
        actor: "user-1",
        action,
        resource: "session",
        requestId: knownId,
      });
      expect(JSON.stringify(seen[0])).not.toContain("person@example.com");
      expect(JSON.stringify(seen[0])).toContain(REDACTED);
    },
  );
});
