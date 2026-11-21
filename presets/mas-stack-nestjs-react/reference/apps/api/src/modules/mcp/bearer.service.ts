import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { McpTokenVerifier } from "@nestjs/mcp";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { SessionLookup, accessTokenStillValid, type AccessPayload } from "../auth/index.js";
import { SystemClock } from "../platform/index.js";

const ACCESS_TTL_SECONDS = 900;
const MILLISECONDS_PER_SECOND = 1000;

@Injectable()
export class BearerVerifier implements McpTokenVerifier {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionLookup,
    private readonly clock: SystemClock,
  ) {}

  async verifyAccessToken(token: string): Promise<AuthInfo | null> {
    try {
      const payload = this.jwt.verify<AccessPayload>(token);
      const user = await this.sessions.findStamp(payload.sub);
      if (user === null || user.shouldChangePassword || !accessTokenStillValid(user, payload)) {
        return null;
      }
      return {
        token,
        clientId: payload.sub,
        scopes: payload.scopes,
        expiresAt: Math.floor(this.clock.now() / MILLISECONDS_PER_SECOND) + ACCESS_TTL_SECONDS,
        resource: new URL("http://127.0.0.1/api/v1/mcp"),
      };
    } catch (error: unknown) {
      if (error instanceof Error) return null;
      throw error;
    }
  }
}
