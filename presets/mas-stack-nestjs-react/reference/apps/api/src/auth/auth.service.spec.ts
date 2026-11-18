import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import type { Response } from "express";
import { describe, expect, it } from "vitest";
import type { PrismaService } from "../prisma.service.js";
import { AuthService } from "./auth.service.js";

const accessSecret = "test-access-secret-test-access";
const refreshSecret = "test-refresh-secret-test-refresh";

function response(): Response & { jar: Record<string, string> } {
  const jar: Record<string, string> = {};
  const res = {
    jar,
    cookie(name: string, value: string) {
      jar[name] = value;
    },
    clearCookie(name: string) {
      jar[name] = "";
    },
    getHeader(name: string) {
      if (name !== "set-cookie") return undefined;
      return Object.entries(jar).map(([key, value]) => `${key}=${value}`);
    },
  };
  return res as unknown as Response & { jar: Record<string, string> };
}

describe("AuthService", () => {
  const jwt = new JwtService({ secret: accessSecret });
  const config = new ConfigService({ JWT_REFRESH_SECRET: refreshSecret });

  it("hides whether the account exists", async () => {
    const passwordHash = await argon2.hash("correct-password", { type: argon2.argon2id });
    const missing = new AuthService(
      { user: { findFirst: () => Promise.resolve(null) } } as unknown as PrismaService,
      jwt,
      config,
    );
    const wrong = new AuthService(
      {
        user: {
          findFirst: () =>
            Promise.resolve({
              id: "user-1",
              passwordHash,
              tokenVersion: 0,
              mustChangePassword: false,
              permissions: [],
            }),
        },
      } as unknown as PrismaService,
      jwt,
      config,
    );
    await expect(
      missing.login({ email: "missing@infra.test", password: "wrong-password" }, response()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const started = Date.now();
    const missingError = await missing
      .login({ email: "missing@infra.test", password: "wrong-password" }, response())
      .then(() => null)
      .catch((error: unknown) => error);
    const missingMs = Date.now() - started;
    const wrongStarted = Date.now();
    const wrongError = await wrong
      .login({ email: "known@infra.test", password: "wrong-password" }, response())
      .then(() => null)
      .catch((error: unknown) => error);
    const wrongMs = Date.now() - wrongStarted;
    expect(missingError).toBeInstanceOf(UnauthorizedException);
    expect(wrongError).toBeInstanceOf(UnauthorizedException);
    expect((missingError as UnauthorizedException).message).toBe((wrongError as UnauthorizedException).message);
    expect(missingMs).toBeGreaterThan(20);
    expect(wrongMs).toBeGreaterThan(20);
  });

  it("issues no business scopes when the password must change", async () => {
    const passwordHash = await argon2.hash("correct-password", { type: argon2.argon2id });
    const service = new AuthService(
      {
        user: {
          findFirst: () =>
            Promise.resolve({
              id: "user-1",
              passwordHash,
              tokenVersion: 3,
              mustChangePassword: true,
              permissions: [{ permission: { code: "records:read" } }],
            }),
        },
        refreshToken: { create: () => Promise.resolve({}) },
      } as unknown as PrismaService,
      jwt,
      config,
    );
    const res = response();
    await service.login({ email: "known@infra.test", password: "correct-password" }, res);
    const payload = jwt.verify<{ scopes: string[]; ver: number }>(res.jar["access_token"] ?? "");
    expect(payload.scopes).toEqual([]);
    expect(payload.ver).toBe(3);
  });

  it("does not reissue business scopes on refresh", async () => {
    const passwordHash = await argon2.hash("correct-password", { type: argon2.argon2id });
    const refresh = jwt.sign(
      { sub: "user-1", family: "fam-1", jti: "jti-1" },
      { secret: refreshSecret },
    );
    const service = new AuthService(
      {
        refreshToken: {
          findUnique: () =>
            Promise.resolve({
              id: "row-1",
              revokedAt: null,
              expiresAt: new Date(Date.now() + 60_000),
              familyId: "fam-1",
            }),
          update: () => Promise.resolve({}),
          create: () => Promise.resolve({}),
        },
        user: {
          findFirst: () =>
            Promise.resolve({
              id: "user-1",
              passwordHash,
              tokenVersion: 4,
              mustChangePassword: true,
              permissions: [{ permission: { code: "records:read" } }],
            }),
        },
      } as unknown as PrismaService,
      jwt,
      config,
    );
    const res = response();
    await service.refresh(refresh, res);
    const payload = jwt.verify<{ scopes: string[] }>(res.jar["access_token"] ?? "");
    expect(payload.scopes).toEqual([]);
  });

  it("bumps the token version atomically on logout", async () => {
    const updates: unknown[] = [];
    const service = new AuthService(
      {
        $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
        refreshToken: { updateMany: () => Promise.resolve({ count: 1 }) },
        user: {
          update: (args: unknown) => {
            updates.push(args);
            return Promise.resolve({});
          },
        },
      } as unknown as PrismaService,
      jwt,
      config,
    );
    await service.logout("user-1", response());
    expect(updates).toEqual([{ where: { id: "user-1" }, data: { tokenVersion: { increment: 1 } } }]);
  });
});
