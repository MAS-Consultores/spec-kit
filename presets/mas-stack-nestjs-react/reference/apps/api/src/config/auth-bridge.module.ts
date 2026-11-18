import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../modules/auth/index.js";

/**
 * McpModule constructs BearerVerifier in its own module. JwtService and
 * SessionLookup have to be visible there. This bridge lives next to the
 * config module, the only place a global module is allowed.
 */
@Global()
@Module({
  imports: [AuthModule],
  exports: [AuthModule],
})
export class AuthBridgeModule {
  readonly label = "auth-bridge";
}
