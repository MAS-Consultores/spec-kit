import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { McpTokenVerifier } from "@nestjs/mcp";
import type { AuthInfo } from "@modelcontextprotocol/server";
import type { AccessPayload } from "../auth/jwt-auth.guard.js";

@Injectable()
export class BearerVerifier implements McpTokenVerifier {
  constructor(private readonly jwt: JwtService) {}

  verifyAccessToken(token: string): AuthInfo | null {
    try {
      const payload = this.jwt.verify<AccessPayload>(token);
      return {
        token,
        clientId: payload.sub,
        scopes: payload.scopes,
        expiresAt: Math.floor(Date.now() / 1000) + 15 * 60,
      };
    } catch {
      return null;
    }
  }
}
