import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import type { Response } from "express";
import { loginSchema } from "@demo/contracts";
import { PrismaService } from "../prisma.service.js";
import { requiredEnv } from "../env.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(body: unknown, res: Response): Promise<{ csrfToken: string }> {
    const input = loginSchema.parse(body);
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    });
    const valid =
      user !== null && (await argon2.verify(user.passwordHash, input.password));
    if (!user || !valid) {
      throw new UnauthorizedException();
    }
    const scopes = user.permissions.map((row) => row.permission.code);
    await this.issue(res, user.id, scopes, randomUUID());
    const csrf = this.readCsrf(res);
    return { csrfToken: csrf };
  }

  async refresh(refreshToken: string | undefined, res: Response): Promise<{ csrfToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    let payload: { sub: string; family: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: requiredEnv("JWT_REFRESH_SECRET") });
    } catch {
      throw new UnauthorizedException();
    }
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) {
      if (row?.revokedAt) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: row.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException();
    }
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const scopes = user.permissions.map((item) => item.permission.code);
    await this.issue(res, user.id, scopes, row.familyId);
    return { csrfToken: this.readCsrf(res) };
  }

  async logout(userId: string, res: Response): Promise<{ csrfToken: string }> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const csrf = randomBytes(16).toString("hex");
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
    res.cookie("csrf_token", csrf, { httpOnly: false, sameSite: "lax", path: "/" });
    return { csrfToken: csrf };
  }

  private async issue(res: Response, userId: string, scopes: string[], familyId: string): Promise<void> {
    const access = this.jwt.sign({ sub: userId, scopes }, { expiresIn: "15m" });
    const refresh = this.jwt.sign(
      { sub: userId, family: familyId },
      { secret: requiredEnv("JWT_REFRESH_SECRET"), expiresIn: "7d" },
    );
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const csrf = randomBytes(16).toString("hex");
    res.cookie("access_token", access, { httpOnly: true, sameSite: "lax", path: "/" });
    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      sameSite: "lax",
      path: "/api/v1/auth",
    });
    res.cookie("csrf_token", csrf, { httpOnly: false, sameSite: "lax", path: "/" });
  }

  private readCsrf(res: Response): string {
    const header = res.getHeader("set-cookie");
    const lines = Array.isArray(header) ? header : typeof header === "string" ? [header] : [];
    const match = lines.join("\n").match(/csrf_token=([^;]+)/);
    return match?.[1] ?? "";
  }
}
