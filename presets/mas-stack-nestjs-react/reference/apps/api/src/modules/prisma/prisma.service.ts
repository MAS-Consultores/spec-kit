import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import pg from "pg";
import { configString } from "../../config/read.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    const pool = new pg.Pool({ connectionString: configString(config, "DATABASE_URL") });
    super({ adapter: new PrismaPg(pool) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
