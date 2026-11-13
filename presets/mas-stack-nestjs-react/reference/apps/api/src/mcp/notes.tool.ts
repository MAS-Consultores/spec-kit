import { Injectable } from "@nestjs/common";
import { Tool } from "@nestjs/mcp";
import { z } from "zod";
import { Can } from "../auth/decorators.js";
import { NotesService } from "../modules/notes/notes.service.js";

const inputSchema = z.object({}).strict();

@Injectable()
export class NotesTool {
  constructor(private readonly notes: NotesService) {}

  @Tool({
    name: "list-notes",
    description: "List notes",
    scopes: ["notes:ver"],
    inputSchema,
  })
  @Can("notes:ver")
  list(): Promise<{ id: string; title: string; body: string }[]> {
    return this.notes.list(["notes:ver"]);
  }
}
