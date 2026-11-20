import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { AuthService, DUMMY_PASSWORD_HASH } from "./auth.service.js";
import type { AuthRepository, AuthUserRecord } from "./auth.repository.js";

const accessSecret = "test-access-secret-test-access";
const refreshSecret = "test-refresh-secret-test-refresh";
const knownPassword = "correct-password";
const wrongPassword = "wrong-password";
const knownEmail = "known@infra.test";
const argonOptions = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 } as const;

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
    shouldChangePassword: false,
    passwordChangedAt: null,
    permissions: [],
    ...partial,
  };
}

const jwt = new JwtService({ secret: accessSecret });
const config = new ConfigService({ JWT_REFRESH_SECRET: refreshSecret });
const clock = { now: (): number => Date.now() };
const ids = {
  uuid: (): string => "00000000-0000-4000-8000-000000000001",
  bytes: (size: number): Buffer => Buffer.alloc(size, 1),
};

function serviceFor(record: AuthUserRecord | null): AuthService {
  return new AuthService(
    { findUserByEmail: () => Promise.resolve(record) } as unknown as AuthRepository,
    jwt,
    config,
    clock,
    ids,
  );
}

async function rejectedLogin(record: AuthUserRecord | null, password: string): Promise<UnauthorizedException> {
  const error = await serviceFor(record)
    .login({ email: knownEmail, password }, response())
    .then(() => null)
    .catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(UnauthorizedException);
  return error as UnauthorizedException;
}

describe("login existence", () => {
  it("pays the Argon2 cost on every rejection path", async () => {
    const passwordHash = await argon2.hash(knownPassword, argonOptions);
    const verify = vi.spyOn(argon2, "verify");
    const started = Date.now();
    const missingError = await rejectedLogin(null, wrongPassword);
    const missingMs = Date.now() - started;
    const wrongStarted = Date.now();
    const wrongError = await rejectedLogin(user({ passwordHash }), wrongPassword);
    const wrongMs = Date.now() - wrongStarted;
    const inactiveError = await rejectedLogin(user({ passwordHash, isActive: false }), knownPassword);
    const lockedError = await rejectedLogin(user({ passwordHash, isLocked: true }), knownPassword);
    const blockedError = await rejectedLogin(user({ passwordHash, isBlocked: true }), knownPassword);
    const noCredential = await rejectedLogin(user({ passwordHash: null }), wrongPassword);
    const unverifiedEmail = await rejectedLogin(user({ passwordHash, isEmailVerified: false }), knownPassword);
    expect(missingError.message).toBe(wrongError.message);
    expect(inactiveError.message).toBe(wrongError.message);
    expect(lockedError.message).toBe(wrongError.message);
    expect(blockedError.message).toBe(wrongError.message);
    expect(noCredential.message).toBe(wrongError.message);
    expect(unverifiedEmail.message).toBe(wrongError.message);
    expect(missingMs).toBeGreaterThan(20);
    expect(wrongMs).toBeGreaterThan(20);
    expect(verify).toHaveBeenCalledWith(DUMMY_PASSWORD_HASH, wrongPassword);
    expect(verify).toHaveBeenCalledWith(passwordHash, wrongPassword);
    expect(verify).toHaveBeenCalledWith(passwordHash, knownPassword);
    const dummyCalls = verify.mock.calls.filter((call) => call[0] === DUMMY_PASSWORD_HASH);
    expect(dummyCalls.length).toBeGreaterThanOrEqual(2);
    verify.mockRestore();
  });

});

describe("restricted session", () => {
  it("issues no business scopes when the password must change", async () => {
    const passwordHash = await argon2.hash(knownPassword, { type: argon2.argon2id });
    const service = new AuthService(
      {
        findUserByEmail: () =>
          Promise.resolve(
            user({
              passwordHash,
              tokenVersion: 3,
              shouldChangePassword: true,
              permissions: [{ permission: { code: "records:read" } }],
            }),
          ),
        createRefresh: () => Promise.resolve(undefined),
      } as unknown as AuthRepository,
      jwt,
      config,
      clock,
      ids,
    );
    const res = response();
    await service.login({ email: knownEmail, password: knownPassword }, res);
    const payload = jwt.verify<{ scopes: string[]; ver: number }>(res.jar["access_token"] ?? "");
    expect(payload.scopes).toEqual([]);
    expect(payload.ver).toBe(3);
  });

});

function refreshDoubles(record: AuthUserRecord, created: string[]): AuthRepository {
  return {
    findRefreshByHash: () =>
      Promise.resolve({
        id: "row-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        familyId: "fam-1",
      }),
    revokeById: () => Promise.resolve(undefined),
    findUserById: () => Promise.resolve(record),
    createRefresh: () => {
      created.push("issued");
      return Promise.resolve(undefined);
    },
  } as unknown as AuthRepository;
}

describe("refresh", () => {
  it("does not reissue business scopes on refresh", async () => {
    const passwordHash = await argon2.hash(knownPassword, { type: argon2.argon2id });
    const refresh = jwt.sign({ sub: "user-1", family: "fam-1", jti: "jti-1" }, { secret: refreshSecret });
    const service = new AuthService(
      refreshDoubles(
        user({
          passwordHash,
          tokenVersion: 4,
          shouldChangePassword: true,
          permissions: [{ permission: { code: "records:read" } }],
        }),
        [],
      ),
      jwt,
      config,
      clock,
      ids,
    );
    const res = response();
    await service.refresh(refresh, res);
    const payload = jwt.verify<{ scopes: string[] }>(res.jar["access_token"] ?? "");
    expect(payload.scopes).toEqual([]);
  });

  it("rejects a refresh token issued before password_changed_at", async () => {
    const passwordHash = await argon2.hash(knownPassword, { type: argon2.argon2id });
    const refresh = jwt.sign({ sub: "user-1", family: "fam-1", jti: "jti-old" }, { secret: refreshSecret });
    const created: string[] = [];
    const service = new AuthService(
      refreshDoubles(user({ passwordHash, passwordChangedAt: new Date(Date.now() + 60_000) }), created),
      jwt,
      config,
      clock,
      ids,
    );
    await expect(service.refresh(refresh, response())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(created).toEqual([]);
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
      clock,
      ids,
    );
    await service.logout("user-1", response());
    expect(calls).toEqual(["user-1"]);
  });
});
