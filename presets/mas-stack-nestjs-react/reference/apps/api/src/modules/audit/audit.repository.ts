import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../prisma/index.js";

export interface AuditRow {
  action: string;
  entity: string;
  entityId: string;
  actorId: string;
  subjectId: string | null;
  result: string;
  metadata: Record<string, string>;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  insert(row: AuditRow): Promise<unknown> {
    const metadata: Prisma.InputJsonObject = row.metadata;
    return this.prisma.auditLog.create({
      data: {
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        actorId: row.actorId,
        subjectId: row.subjectId,
        result: row.result,
        metadata,
      },
    });
  }
}
