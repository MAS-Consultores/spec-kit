import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
  })
  .strict();

export type Login = z.infer<typeof loginSchema>;

export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "API", version: "1.0.0" },
  paths: {
    "/api/v1/health": { get: { responses: { "200": { description: "ok" } } } },
    "/api/v1/auth/login": { post: { responses: { "201": { description: "login" } } } },
    "/api/v1/auth/refresh": { post: { responses: { "201": { description: "refresh" } } } },
    "/api/v1/auth/logout": { post: { responses: { "201": { description: "logout" } } } },
    "/api/v1/auth/me": { get: { responses: { "200": { description: "session" } } } },
  },
} as const;
