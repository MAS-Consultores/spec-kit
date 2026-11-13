import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
  })
  .strict();

export const noteCreateSchema = z
  .object({
    title: z.string().min(1),
    body: z.string(),
  })
  .strict();

export const noteSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
  })
  .strict();

export type Login = z.infer<typeof loginSchema>;
export type Note = z.infer<typeof noteSchema>;

export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "Demo API", version: "1.0.0" },
  paths: {
    "/api/v1/health": { get: { responses: { "200": { description: "ok" } } } },
    "/api/v1/auth/login": { post: { responses: { "201": { description: "login" } } } },
    "/api/v1/auth/refresh": { post: { responses: { "201": { description: "refresh" } } } },
    "/api/v1/auth/logout": { post: { responses: { "201": { description: "logout" } } } },
    "/api/v1/notes": {
      get: { responses: { "200": { description: "list" } } },
      post: { responses: { "201": { description: "create" } } },
    },
    "/api/v1/notes/{id}": { delete: { responses: { "200": { description: "delete" } } } },
  },
} as const;
