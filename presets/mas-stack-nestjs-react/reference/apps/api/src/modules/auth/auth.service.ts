import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { loginSchema } from "@demo/contracts/auth";
import argon2 from "argon2";
import type { Response } from "express";
import { configString } from "../../config/read.js";
import { AuthRepository, type AuthUserRecord } from "./auth.repository.js";
import { businessScopes, refreshIssuedAfterPasswordChange } from "./session.token.js";

/** Argon2id (m=65536, t=3, p=4), the same parameters as real password hashes. */
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$i+7v1Y65Et9pQzNYgwqHlw$5tzWjRR6z6jn37Vtr+n0w5HuSE4sjifWd8r4yqclQ4Y";

function storedPasswordHash(user: AuthUserRecord | null): string | null {
  const hash = user?.passwordHash;
  if (typeof hash !== "string" || !hash.startsWith("$argon2")) {
    return null;
  }
  return hash;
}

/** Every login 401 is decided only after a real hash or the dummy hash was verified. */
function loginRejected(user: AuthUserRecord | null, passwordValid: boolean): boolean {
  if (!user || !passwordValid || storedPasswordHash(user) === null) {
    return true;
  }
  if (user.active === false || user.locked === true || user.blocked === true) {
    return true;
  }
  if (user.emailVerified === false) {
    return true;
  }
  return false;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(body: unknown, res: Response): Promise<{ csrfToken: string }> {
    const input = loginSchema.parse(body);
    const user = await this.users.findUserByEmail(input.email);
    const valid = await this.verifyPresentedPassword(storedPasswordHash(user), input.password);
    if (!user || loginRejected(user, valid)) {
      throw new UnauthorizedException();
    }
    await this.issue(res, user, randomUUID());
    return { csrfToken: this.readCsrf(res) };
  }

  async refresh(refreshToken: string | undefined, res: Response): Promise<{ csrfToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const payload = this.readRefresh(refreshToken);
    const row = await this.users.findRefreshByHash(hashToken(refreshToken));
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) {
      if (row?.revokedAt) {
        await this.users.revokeFamily(row.familyId);
      }
      throw new UnauthorizedException();
    }
    await this.users.revokeById(row.id);
    const user = await this.users.findUserById(payload.sub);
    if (!user || !refreshIssuedAfterPasswordChange(user, payload.iat)) {
      throw new UnauthorizedException();
    }
    await this.issue(res, user, row.familyId);
    return { csrfToken: this.readCsrf(res) };
  }

  async logout(userId: string, res: Response): Promise<{ csrfToken: string }> {
    await this.users.revokeSessions(userId);
    const csrf = randomBytes(16).toString("hex");
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
    res.cookie("csrf_token", csrf, { httpOnly: false, sameSite: "lax", path: "/" });
    return { csrfToken: csrf };
  }

  private async verifyPresentedPassword(hash: string | null, password: string): Promise<boolean> {
    return argon2.verify(hash ?? DUMMY_PASSWORD_HASH, password);
  }

  private readRefresh(refreshToken: string): { sub: string; iat?: number } {
    try {
      return this.jwt.verify(refreshToken, {
        secret: configString(this.config, "JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async issue(res: Response, user: AuthUserRecord, familyId: string): Promise<void> {
    const csrf = randomBytes(16).toString("hex");
    const access = this.jwt.sign(
      { sub: user.id, scopes: businessScopes(user), csrf, ver: user.tokenVersion },
      { expiresIn: "15m" },
    );
    const refresh = this.jwt.sign(
      { sub: user.id, family: familyId, jti: randomUUID() },
      { secret: configString(this.config, "JWT_REFRESH_SECRET"), expiresIn: "7d" },
    );
    await this.users.createRefresh({
      userId: user.id,
      familyId,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    res.cookie("access_token", access, { httpOnly: true, sameSite: "lax", path: "/" });
    res.cookie("refresh_token", refresh, { httpOnly: true, sameSite: "lax", path: "/api/v1/auth" });
    res.cookie("csrf_token", csrf, { httpOnly: false, sameSite: "lax", path: "/" });
  }

  private readCsrf(res: Response): string {
    const header = res.getHeader("set-cookie");
    const lines = Array.isArray(header) ? header : typeof header === "string" ? [header] : [];
    const match = lines.join("\n").match(/csrf_token=([^;]+)/);
    return match?.[1] ?? "";
  }
}
