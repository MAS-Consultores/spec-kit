import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import pg from "pg";
import { requiredEnv } from "./env.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const pool = new pg.Pool({ connectionString: requiredEnv("DATABASE_URL") });
    super({ adapter: new PrismaPg(pool) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
