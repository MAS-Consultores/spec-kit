import "reflect-metadata";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
function server(app: INestApplication): Parameters<typeof request>[0] {
  const value: unknown = app.getHttpServer();
  if (typeof value !== "object" || value === null) {
    throw new Error("HTTP server missing");
  }
  return value as Parameters<typeof request>[0];
}

describe("mcp", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  beforeAll(async () => {
    process.env["JWT_ACCESS_SECRET"] ??= "test-access-secret-test-access";
    process.env["LOGIN_THROTTLE_LIMIT"] = "1000";
    process.env["MCP_ENABLED"] = "true";
    const loaded = await import("../src/app.module.js");
    app = await NestFactory.create(loaded.AppModule, { logger: ["error"] });
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.use(cookieParser());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without a bearer token", async () => {
    const res = await request(server(app)).post("/api/v1/mcp").send({});
    expect(res.status).toBe(401);
    const challenge = res.headers["www-authenticate"];
    expect(typeof challenge === "string" ? challenge : "").toMatch(/Bearer/i);
  });
});
