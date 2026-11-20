import "reflect-metadata";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/modules/prisma/index.js";
import { ThrottleRepository } from "../src/modules/throttle/throttle.repository.js";

const loginPath = "/api/v1/auth/login";
const throttleEmail = "throttle@infra.test";
const throttlePassword = "rotation-secret";

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
    await agent.post(loginPath).send({ email: throttleEmail, password: throttlePassword });
    await agent.post(loginPath).send({ email: throttleEmail, password: throttlePassword });
    const limited = await agent
      .post(loginPath)
      .send({ email: throttleEmail, password: throttlePassword });
    expect(limited.status).toBe(429);
  });

  it("counts concurrent hits exactly, rejects inside the lock, and purges expired rows", async () => {
    const buckets = app.get(ThrottleRepository);
    const prisma = app.get(PrismaService);
    const key = "concurrency-" + String(Date.now());
    await prisma.$executeRaw`INSERT INTO rate_limit_buckets (key, hits, expires_at) VALUES (${key}, 9, NOW() - INTERVAL '1 second')`;
    const rounds = await Promise.all(Array.from({ length: 20 }, () => buckets.consume(key, 60_000, 5)));
    const hits = rounds.map((row) => row.hits).sort((left, right) => left - right);
    expect(hits).toEqual(Array.from({ length: 20 }, (_unused, index) => index + 1));
    expect(rounds.filter((row) => row.isBlocked)).toHaveLength(15);
    const left = await prisma.$queryRaw<{ hits: number }[]>`SELECT hits FROM rate_limit_buckets WHERE key = ${key}`;
    expect(left[0]?.hits).toBe(20);
  });
});
