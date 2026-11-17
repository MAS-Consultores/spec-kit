import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { McpModule } from "@nestjs/mcp";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { CsrfGuard } from "./auth/csrf.guard.js";
import { Public, SkipCsrf } from "./auth/decorators.js";
import { JwtAuthGuard } from "./auth/jwt-auth.guard.js";
import { JwtStrategy } from "./auth/jwt.strategy.js";
import { PermissionsGuard } from "./auth/permissions.guard.js";
import { AppConfigModule } from "./config/config.module.js";
import { configNumber, configString } from "./config/read.js";
import { HealthController } from "./health.controller.js";
import { BearerVerifier } from "./mcp/token-verifier.js";
import { PrismaService } from "./prisma.service.js";
import { mcpScopesSupported, sliceControllers, sliceProviders } from "./slices.js";

@Module({
  imports: [
    AppConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: configString(config, "JWT_ACCESS_SECRET"),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: "default",
            ttl: 60_000,
            limit: configNumber(config, "LOGIN_THROTTLE_LIMIT"),
          },
        ],
      }),
    }),
    McpModule.forRoot({
      name: "demo",
      version: "0.0.1",
      path: "mcp",
      decorators: [Public(), SkipCsrf()],
      auth: {
        verifier: BearerVerifier,
        resource: "http://127.0.0.1/api/v1/mcp",
        authorizationServers: ["http://127.0.0.1"],
        scopesSupported: mcpScopesSupported,
      },
    }),
  ],
  controllers: [HealthController, AuthController, ...sliceControllers],
  providers: [
    PrismaService,
    AuthService,
    JwtStrategy,
    ...sliceProviders,
    BearerVerifier,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {
  readonly label = "api";
}
