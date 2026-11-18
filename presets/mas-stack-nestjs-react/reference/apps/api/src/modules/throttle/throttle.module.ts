import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { configNumber } from "../../config/read.js";
import { PrismaModule } from "../prisma/index.js";
import { DbThrottlerStorage } from "./throttle.service.js";
import { ThrottleRepository } from "./throttle.repository.js";

@Module({
  imports: [PrismaModule],
  providers: [ThrottleRepository, DbThrottlerStorage],
  exports: [DbThrottlerStorage],
})
export class ThrottleStorageModule {
  readonly label = "throttle-storage";
}

@Module({
  imports: [
    ThrottleStorageModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottleStorageModule],
      inject: [ConfigService, DbThrottlerStorage],
      useFactory: (config: ConfigService, storage: DbThrottlerStorage) => ({
        throttlers: [
          {
            name: "default",
            ttl: 60_000,
            limit: configNumber(config, "LOGIN_THROTTLE_LIMIT"),
          },
        ],
        storage,
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  exports: [ThrottlerModule],
})
export class ThrottleModule {
  readonly label = "throttle";
}
