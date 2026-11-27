import { redactSensitive } from "./redact.js";

export type AuditAction = "login" | "login_failed" | "roles_changed" | "permissions_changed" | "delete";

export type AuditEvent = {
  actor: string;
  action: AuditAction;
  resource: string;
  result: "ok" | "denied";
  requestId: string;
};

export type AuditSink = (event: AuditEvent) => void;

const auditBus: { emit: AuditSink } = { emit: () => undefined };

export function setAuditSink(next: AuditSink): void {
  auditBus.emit = next;
}

/** Actor, acción, recurso, resultado y requestId. El redactado corre antes de emitir. */
export function emitAudit(event: AuditEvent & Record<string, string>): AuditEvent {
  const safe = redactSensitive(event) as AuditEvent;
  auditBus.emit(safe);
  return safe;
}
