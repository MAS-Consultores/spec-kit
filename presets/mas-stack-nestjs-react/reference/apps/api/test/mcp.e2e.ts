import "reflect-metadata";
import { JwtService } from "@nestjs/jwt";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

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
    app = await NestFactory.create(AppModule, { logger: false });
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

  it("rejects a bearer token whose scope is insufficient", async () => {
    const jwt = new JwtService({ secret: process.env["JWT_ACCESS_SECRET"] });
    const token = jwt.sign({ sub: "reader", scopes: ["notes:crear"] });
    const res = await request(server(app))
      .post("/api/v1/mcp")
      .set("Authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list-notes", arguments: {} } });
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toMatch(/insufficient_scope/);
  });
});
