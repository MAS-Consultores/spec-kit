import { PrismaService } from "../src/prisma.service.ts";

export class EdgeController {
  constructor(private readonly prisma: PrismaService) {}
}
