import { Module } from "@nestjs/common";
import { AuthBridgeModule } from "./config/auth-bridge.module.js";
import { AppConfigModule } from "./config/config.module.js";
import { LoggingModule } from "./logging/logging.module.js";
import { mcpEnabled } from "./config/env.js";
import { AuditModule } from "./modules/audit/index.js";
import { AuthModule } from "./modules/auth/index.js";
import { HealthModule } from "./modules/health/index.js";
import { ApiMcpModule } from "./modules/mcp/index.js";
import { ThrottleModule } from "./modules/throttle/index.js";

const mcpModules = mcpEnabled() ? [ApiMcpModule] : [];

@Module({
  imports: [AppConfigModule, LoggingModule, AuthBridgeModule, ThrottleModule, AuditModule, AuthModule, HealthModule, ...mcpModules],
})
export class AppModule {
  readonly label = "api";
}
