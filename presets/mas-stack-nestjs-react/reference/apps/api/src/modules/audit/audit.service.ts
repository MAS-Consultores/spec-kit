import { Injectable } from "@nestjs/common";
import { requireAuditEventKey } from "@demo/contracts/audit";
import { AuditRepository } from "./audit.repository.js";

export interface AuditWrite {
  eventKey: string;
  result: "success" | "failure";
  actorId: string;
  subjectId: string | null;
  metadata?: Readonly<Record<string, string>>;
}

const SECRET_KEY = /password|passwd|secret|token|hash|authorization|cookie/i;

export function publicAuditMetadata(input: Readonly<Record<string, string>> | undefined): Record<string, string> {
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (SECRET_KEY.test(key)) {
      throw new Error(`audit metadata rejects ${key}`);
    }
    metadata[key] = value;
  }
  return metadata;
}

@Injectable()
export class AuditService {
  constructor(private readonly records: AuditRepository) {}

  record(input: AuditWrite): Promise<unknown> {
    const eventKey = requireAuditEventKey(input.eventKey);
    return this.records.insert({
      action: eventKey,
      entity: "activity",
      entityId: input.subjectId ?? input.actorId,
      actorId: input.actorId,
      subjectId: input.subjectId,
      result: input.result,
      metadata: publicAuditMetadata(input.metadata),
    });
  }
}
