import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../modules/auth/index.js";

/**
 * Global re-export of AuthModule. The verifier still needs `imports: [AuthModule]`
 * on `McpModule.forRoot`: Nest builds that dynamic module apart from this bridge,
 * and a global re-export does not satisfy `JwtService` there.
 */
@Global()
@Module({
  imports: [AuthModule],
  exports: [AuthModule],
})
export class AuthBridgeModule {
  readonly label = "auth-bridge";
}
