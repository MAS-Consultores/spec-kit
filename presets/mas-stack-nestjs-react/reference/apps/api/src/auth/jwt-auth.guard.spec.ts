import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

function context(type: string, token?: string): ExecutionContext {
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
        originalUrl: "/api/v1/notes",
        cookies: token ? { access_token: token } : {},
      }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  };
  return stub as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  const guard = new JwtAuthGuard(new Reflector(), new JwtService({ secret: "test-secret-test-secret" }));

  it("does not intercept a non-http context", () => {
    expect(guard.canActivate(context("rpc"))).toBe(true);
  });

  it("rejects an http request without a cookie", () => {
    expect(() => guard.canActivate(context("http"))).toThrow(UnauthorizedException);
  });
});
