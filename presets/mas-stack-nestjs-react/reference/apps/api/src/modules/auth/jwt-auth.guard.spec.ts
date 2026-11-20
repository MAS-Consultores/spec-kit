import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import type { SessionLookup } from "./session.service.js";
import type { SessionStamp } from "./session.token.js";

const secret = "test-secret-test-secret";

function context(type: string, token?: string, url = "/api/v1/auth/me"): ExecutionContext {
  const stub = {
    getType: () => type,
    getHandler: () => function handler() {},
    getClass: () =>
      class Handler {
        readonly label = "handler";
      },
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        originalUrl: url,
        cookies: token !== undefined && token.length > 0 ? { access_token: token } : {},
      }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  };
  return stub as unknown as ExecutionContext;
}

function sessions(stamp: SessionStamp | null): SessionLookup {
  return { findStamp: () => Promise.resolve(stamp) } as unknown as SessionLookup;
}

describe("JwtAuthGuard", () => {
  const jwt = new JwtService({ secret });
  const open: SessionStamp = {
    tokenVersion: 0,
    passwordChangedAt: null,
    shouldChangePassword: false,
  };

  function guard(stamp: SessionStamp | null = open): JwtAuthGuard {
    return new JwtAuthGuard(new Reflector(), jwt, sessions(stamp));
  }

  function token(ver = 0): string {
    return jwt.sign({ sub: "user-1", scopes: ["records:read"], csrf: "csrf", ver });
  }

  it("does not intercept a non-http context", () => {
    expect(guard().canActivate(context("rpc"))).toBe(true);
  });

  it("rejects an http request without a cookie", () => {
    expect(() => guard().canActivate(context("http"))).toThrow(UnauthorizedException);
  });

  it("does not bypass auth when the query string contains /mcp", () => {
    expect(() => guard().canActivate(context("http", undefined, "/api/v1/records?next=/mcp"))).toThrow(
      UnauthorizedException,
    );
  });

  it("allows the mcp path itself when the query string is present", () => {
    expect(guard().canActivate(context("http", undefined, "/api/v1/mcp?next=/records"))).toBe(true);
  });

  it("rejects an access token from before the password change or an older version", async () => {
    const changed = new Date(Date.now() + 60_000);
    await expect(
      guard({ tokenVersion: 0, passwordChangedAt: changed, shouldChangePassword: false }).canActivate(
        context("http", token()),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard({ tokenVersion: 1, passwordChangedAt: null, shouldChangePassword: false }).canActivate(
        context("http", token(0)),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("blocks business routes for a restricted session and still allows me", async () => {
    const restricted: SessionStamp = {
      tokenVersion: 0,
      passwordChangedAt: null,
      shouldChangePassword: true,
    };
    await expect(
      guard(restricted).canActivate(context("http", token(), "/api/v1/records")),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard(restricted).canActivate(context("http", token(), "/api/v1/auth/me"))).resolves.toBe(true);
  });
});
