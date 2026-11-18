import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import type { Response } from "express";
import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service.js";
import type { AuthRepository, AuthUserRecord } from "./auth.repository.js";

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

function user(partial: Partial<AuthUserRecord> & Pick<AuthUserRecord, "passwordHash">): AuthUserRecord {
  return {
    id: "user-1",
    tokenVersion: 0,
    mustChangePassword: false,
    passwordChangedAt: null,
    permissions: [],
    ...partial,
  };
}

const jwt = new JwtService({ secret: accessSecret });
const config = new ConfigService({ JWT_REFRESH_SECRET: refreshSecret });

describe("login existence", () => {
  it("hides whether the account exists", async () => {
    const passwordHash = await argon2.hash("correct-password", { type: argon2.argon2id });
    const missing = new AuthService(
      { findUserByEmail: () => Promise.resolve(null) } as unknown as AuthRepository,
      jwt,
      config,
    );
    const wrong = new AuthService(
      { findUserByEmail: () => Promise.resolve(user({ passwordHash })) } as unknown as AuthRepository,
      jwt,
      config,
    );
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

});

describe("restricted session", () => {
  it("issues no business scopes when the password must change", async () => {
    const passwordHash = await argon2.hash("correct-password", { type: argon2.argon2id });
    const service = new AuthService(
      {
        findUserByEmail: () =>
          Promise.resolve(
            user({
              passwordHash,
              tokenVersion: 3,
              mustChangePassword: true,
              permissions: [{ permission: { code: "records:read" } }],
            }),
          ),
        createRefresh: () => Promise.resolve(undefined),
      } as unknown as AuthRepository,
      jwt,
      config,
    );
    const res = response();
    await service.login({ email: "known@infra.test", password: "correct-password" }, res);
    const payload = jwt.verify<{ scopes: string[]; ver: number }>(res.jar["access_token"] ?? "");
    expect(payload.scopes).toEqual([]);
    expect(payload.ver).toBe(3);
  });

});

describe("refresh", () => {
  it("does not reissue business scopes on refresh", async () => {
    const passwordHash = await argon2.hash("correct-password", { type: argon2.argon2id });
    const refresh = jwt.sign({ sub: "user-1", family: "fam-1", jti: "jti-1" }, { secret: refreshSecret });
    const service = new AuthService(
      {
        findRefreshByHash: () =>
          Promise.resolve({
            id: "row-1",
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            familyId: "fam-1",
          }),
        revokeById: () => Promise.resolve(undefined),
        findUserById: () =>
          Promise.resolve(
            user({
              passwordHash,
              tokenVersion: 4,
              mustChangePassword: true,
              permissions: [{ permission: { code: "records:read" } }],
            }),
          ),
        createRefresh: () => Promise.resolve(undefined),
      } as unknown as AuthRepository,
      jwt,
      config,
    );
    const res = response();
    await service.refresh(refresh, res);
    const payload = jwt.verify<{ scopes: string[] }>(res.jar["access_token"] ?? "");
    expect(payload.scopes).toEqual([]);
  });

});

describe("logout", () => {
  it("bumps the token version atomically on logout", async () => {
    const calls: string[] = [];
    const service = new AuthService(
      {
        revokeSessions: (userId: string) => {
          calls.push(userId);
          return Promise.resolve(undefined);
        },
      } as unknown as AuthRepository,
      jwt,
      config,
    );
    await service.logout("user-1", response());
    expect(calls).toEqual(["user-1"]);
  });
});
