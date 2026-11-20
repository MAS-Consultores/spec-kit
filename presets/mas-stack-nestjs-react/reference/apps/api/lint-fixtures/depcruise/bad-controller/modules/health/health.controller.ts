import { PrismaClient } from "@prisma/client";

export class HealthController {
  client(): PrismaClient {
    return new PrismaClient();
  }
}
