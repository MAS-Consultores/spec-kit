import { PrismaService } from "../prisma/index.js";

export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}
}
