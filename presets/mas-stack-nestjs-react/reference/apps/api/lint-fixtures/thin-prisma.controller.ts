import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../modules/prisma/prisma.service.js";

export class OrdersController {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<unknown> {
    return Promise.resolve(new PrismaClient());
  }
}
