import "reflect-metadata";
import { execFileSync } from "node:child_process";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { noteSchema } from "@demo/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { headerLines } from "../src/http.js";

process.env["JWT_ACCESS_SECRET"] ??= "test-access-secret-test-access";
process.env["JWT_REFRESH_SECRET"] ??= "test-refresh-secret-test-refresh";
process.env["LOGIN_THROTTLE_LIMIT"] = "1000";

function cookie(res: request.Response, name: string): string {
  const line = headerLines(res.headers["set-cookie"]).find((item) => item.startsWith(`${name}=`));
  return line?.split(";")[0]?.slice(name.length + 1) ?? "";
}

function server(app: INestApplication): Parameters<typeof request>[0] {
  const value: unknown = server(app);
  if (typeof value !== "object" || value === null) {
    throw new Error("HTTP server missing");
  }
  return value as Parameters<typeof request>[0];
}

async function boot(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.use(cookieParser());
  await app.init();
  return app;
}

describe("api", () => {
  let app: INestApplication;
  beforeAll(async () => {
    execFileSync("node", ["scripts/truncate-e2e.mjs"], {
      cwd: new URL("../../..", import.meta.url).pathname,
      stdio: "inherit",
      env: process.env,
    });
    execFileSync("pnpm", ["--filter", "@demo/api", "exec", "prisma", "db", "seed"], {
      cwd: new URL("../../..", import.meta.url).pathname,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: `${process.env["SEED_DATABASE_URL"] ?? ""}_not_e2e`,
      },
    });
    process.env["DATABASE_URL"] = process.env["SEED_DATABASE_URL"];
    app = await boot();
  });
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without a session", async () => {
    const res = await request(server(app)).get("/api/v1/notes");
    expect(res.status).toBe(401);
  });

  it("rotates refresh and csrf, then logout needs the rotated csrf", async () => {
    const login = await request(server(app))
      .post("/api/v1/auth/login")
      .send({ email: "admin@example.com", password: "password123" });
    expect(login.status).toBe(201);
    const setCookie = login.headers["set-cookie"];
    const joined = Array.isArray(setCookie) ? setCookie.join("\n") : String(setCookie);
    expect(joined).toMatch(/access_token=[^;]+;.*HttpOnly/i);
    expect(joined).toMatch(/refresh_token=[^;]+;.*HttpOnly/i);
    const firstCsrf = cookie(login, "csrf_token");
    const refresh = await request(server(app))
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refresh_token=${cookie(login, "refresh_token")}`, `csrf_token=${firstCsrf}`]);
    expect(refresh.status).toBe(201);
    const rotated = cookie(refresh, "csrf_token");
    expect(rotated).not.toBe(firstCsrf);
    const stale = await request(server(app))
      .post("/api/v1/auth/logout")
      .set("Cookie", [
        `access_token=${cookie(refresh, "access_token")}`,
        `csrf_token=${firstCsrf}`,
      ])
      .set("x-csrf-token", firstCsrf);
    expect(stale.status).toBe(403);
    const done = await request(server(app))
      .post("/api/v1/auth/logout")
      .set("Cookie", [
        `access_token=${cookie(refresh, "access_token")}`,
        `csrf_token=${rotated}`,
      ])
      .set("x-csrf-token", rotated);
    expect(done.status).toBe(201);
    const reused = await request(server(app))
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refresh_token=${cookie(login, "refresh_token")}`]);
    expect(reused.status).toBe(401);
  });

  it("returns 403 when CASL denies delete", async () => {
    const login = await request(server(app))
      .post("/api/v1/auth/login")
      .send({ email: "reader@example.com", password: "password123" });
    const created = await request(server(app))
      .post("/api/v1/auth/login")
      .send({ email: "admin@example.com", password: "password123" });
    const note = await request(server(app))
      .post("/api/v1/notes")
      .set("Cookie", [`access_token=${cookie(created, "access_token")}`, `csrf_token=${cookie(created, "csrf_token")}`])
      .set("x-csrf-token", cookie(created, "csrf_token"))
      .send({ title: "Uno", body: "cuerpo" });
    expect(note.status).toBe(201);
    const denied = await request(server(app))
      .delete(`/api/v1/notes/${noteSchema.parse(note.body).id}`)
      .set("Cookie", [`access_token=${cookie(login, "access_token")}`, `csrf_token=${cookie(login, "csrf_token")}`])
      .set("x-csrf-token", cookie(login, "csrf_token"));
    expect(denied.status).toBe(403);
  });
});
