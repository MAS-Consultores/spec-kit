import { Injectable } from "@nestjs/common";
import { noteCreateSchema, type Note } from "@demo/contracts";
import { createAppAbility } from "../../auth/ability.js";
import { PrismaService } from "../../prisma.service.js";

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(scopes: readonly string[]): Promise<Note[]> {
    const ability = createAppAbility(scopes);
    if (!ability.can("notes:ver", "Note")) {
      return [];
    }
    const rows = await this.prisma.note.findMany({
      where: { deletedAt: null },
      orderBy: { title: "asc" },
    });
    return rows.map((row) => ({ id: row.id, title: row.title, body: row.body }));
  }

  async create(scopes: readonly string[], body: unknown, actorId: string): Promise<Note> {
    const ability = createAppAbility(scopes);
    if (!ability.can("notes:crear", "Note")) {
      return Promise.reject(new Error("forbidden"));
    }
    const input = noteCreateSchema.parse(body);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.note.create({
        data: { title: input.title, body: input.body, createdBy: actorId },
      });
      await tx.auditLog.create({
        data: {
          action: "create",
          entity: "Note",
          entityId: created.id,
          actorId,
        },
      });
      return created;
    });
    return { id: row.id, title: row.title, body: row.body };
  }

  async softDelete(scopes: readonly string[], id: string, actorId: string): Promise<void> {
    const ability = createAppAbility(scopes);
    if (!ability.can("notes:eliminar", "Note")) {
      throw new Error("forbidden");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.note.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: actorId },
      });
      await tx.auditLog.create({
        data: { action: "soft-delete", entity: "Note", entityId: id, actorId },
      });
    });
  }
}
