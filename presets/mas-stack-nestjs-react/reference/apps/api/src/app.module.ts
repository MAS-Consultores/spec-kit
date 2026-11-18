import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module.js";
import { AuthModule } from "./modules/auth/index.js";
import { HealthModule } from "./modules/health/index.js";
import { ApiMcpModule } from "./modules/mcp/index.js";
import { ThrottleModule } from "./modules/throttle/index.js";

@Module({
  imports: [AppConfigModule, ThrottleModule, AuthModule, HealthModule, ApiMcpModule],
})
export class AppModule {
  readonly label = "api";
}
