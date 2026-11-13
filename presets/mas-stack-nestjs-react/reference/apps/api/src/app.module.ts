import { Module } from "@nestjs/common";
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
import { HealthController } from "./health.controller.js";
import { NotesTool } from "./mcp/notes.tool.js";
import { BearerVerifier } from "./mcp/token-verifier.js";
import { NotesController } from "./modules/notes/notes.controller.js";
import { NotesService } from "./modules/notes/notes.service.js";
import { PrismaService } from "./prisma.service.js";
import { requiredEnv } from "./env.js";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: requiredEnv("JWT_ACCESS_SECRET"),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60_000,
          limit: Number(process.env["LOGIN_THROTTLE_LIMIT"] ?? "1000"),
        },
      ],
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
        scopesSupported: ["notes:ver"],
      },
    }),
  ],
  controllers: [HealthController, AuthController, NotesController],
  providers: [
    PrismaService,
    AuthService,
    JwtStrategy,
    NotesService,
    NotesTool,
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
