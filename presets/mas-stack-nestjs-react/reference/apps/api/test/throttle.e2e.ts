import "reflect-metadata";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

describe("throttler", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  beforeAll(async () => {
    process.env["LOGIN_THROTTLE_LIMIT"] = "2";
    app = await NestFactory.create(AppModule, { logger: ["error"], abortOnError: false });
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.use(cookieParser());
    await app.init();
  });
  afterAll(async () => {
    process.env["LOGIN_THROTTLE_LIMIT"] = "1000";
    await app.close();
  });
  it("returns 429 on its own limiter", async () => {
    const value: unknown = app.getHttpServer();
    if (typeof value !== "object" || value === null) {
      throw new Error("HTTP server missing");
    }
    const agent = request(value as Parameters<typeof request>[0]);
    await agent.post("/api/v1/auth/login").send({ email: "admin@example.com", password: "password123" });
    await agent.post("/api/v1/auth/login").send({ email: "admin@example.com", password: "password123" });
    const limited = await agent
      .post("/api/v1/auth/login")
      .send({ email: "admin@example.com", password: "password123" });
    expect(limited.status).toBe(429);
  });
});
