import { Module } from "@nestjs/common";
import { McpModule } from "@nestjs/mcp";
import { AuthModule, Public, SkipCsrf } from "../auth/index.js";
import { BearerVerifier } from "./bearer.service.js";

@Module({
  imports: [
    AuthModule,
    McpModule.forRoot({
      name: "demo",
      version: "0.0.1",
      path: "mcp",
      decorators: [Public(), SkipCsrf()],
      auth: {
        verifier: BearerVerifier,
        resource: "http://127.0.0.1/api/v1/mcp",
        authorizationServers: ["http://127.0.0.1"],
        scopesSupported: [],
      },
    }),
  ],
  providers: [BearerVerifier],
})
export class ApiMcpModule {
  readonly label = "mcp";
}
