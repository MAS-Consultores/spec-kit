import { Body, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Can } from "../../auth/decorators.js";
import type { AccessPayload } from "../../auth/jwt-auth.guard.js";
import { NotesService } from "./notes.service.js";

@Controller("notes")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @Can("notes:ver")
  list(@Req() request: Request & { user?: AccessPayload }) {
    return this.notes.list(request.user?.scopes ?? []);
  }

  @Post()
  @Can("notes:crear")
  create(@Body() body: unknown, @Req() request: Request & { user?: AccessPayload }) {
    return this.notes.create(request.user?.scopes ?? [], body, request.user?.sub ?? "");
  }

  @Delete(":id")
  @Can("notes:eliminar")
  async remove(
    @Param("id") id: string,
    @Req() request: Request & { user?: AccessPayload },
  ): Promise<{ ok: true }> {
    await this.notes.softDelete(request.user?.scopes ?? [], id, request.user?.sub ?? "");
    return { ok: true };
  }
}
