import { SetMetadata } from "@nestjs/common";

export const AUDIT_EVENT = "auditEvent";
export const NO_AUDIT = "noAudit";

/** Records an append-only activity event. The key must exist in the audit catalog. */
export const Audit = (eventKey: string): MethodDecorator => SetMetadata(AUDIT_EVENT, eventKey);

/** Explicit opt-out. The reason is required and is not a substitute for a catalog key. */
export const NoAudit = (reason: string): MethodDecorator => SetMetadata(NO_AUDIT, reason);
