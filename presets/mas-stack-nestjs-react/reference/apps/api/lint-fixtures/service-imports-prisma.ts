import { PrismaService } from "../src/modules/prisma/prisma.service.ts";

export class BillingService {
  constructor(private readonly prisma: PrismaService) {}
}
