import { PrismaService } from "../src/prisma.service.ts";

export class NotesEdgeController {
  constructor(private readonly prisma: PrismaService) {}
}
