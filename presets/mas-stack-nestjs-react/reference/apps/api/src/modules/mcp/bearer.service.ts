import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { McpTokenVerifier } from "@nestjs/mcp";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { SessionLookup, accessTokenStillValid, type AccessPayload } from "../auth/index.js";

@Injectable()
export class BearerVerifier implements McpTokenVerifier {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionLookup,
  ) {}

  async verifyAccessToken(token: string): Promise<AuthInfo | null> {
    try {
      const payload = this.jwt.verify<AccessPayload>(token);
      const user = await this.sessions.findStamp(payload.sub);
      if (!user || user.mustChangePassword || !accessTokenStillValid(user, payload)) {
        return null;
      }
      return {
        token,
        clientId: payload.sub,
        scopes: payload.scopes,
        expiresAt: Math.floor(Date.now() / 1000) + 15 * 60,
        resource: new URL("http://127.0.0.1/api/v1/mcp"),
      };
    } catch {
      return null;
    }
  }
}
