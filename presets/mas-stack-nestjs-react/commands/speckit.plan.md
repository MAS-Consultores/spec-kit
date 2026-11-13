---
description: NestJS + React planning requirements on top of MAS planning.
strategy: wrap
---

## Reference skeleton

Copy and adapt `.specify/reference/` (the canonical NestJS + React monorepo),
including its `package.json` files and `pnpm-lock.yaml`. Do not invent a second
Prisma, auth, MCP, or shadcn layout and do not resolve new versions.

```typescript
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["SEED_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
  migrations: {
    seed: "node --import tsx prisma/seed.ts",
  },
});
```

## NestJS + React Planning Requirements

Resolve contradictions between `spec.md` and `.specify/memory/stack-context.md` inside `MAS Stack Validation` before writing design artifacts.

Locale rule: stack context does not override the spec. If the spec says es-CL is the only required locale, plan only `locales/es-CL.json` and do not add `en.json` or a language switcher. Record the decision as `PASS` with that note. Add `en` only when the spec requires it.

`quickstart.md` commands MUST use `pnpm --filter` with the `name` from each workspace `package.json` (for example `@demo/api` and `@demo/web`). Do not use the directory names `api` or `web` unless that string is the package name.

State `apps/api/prisma.config.ts` at the package root, `queryClient.query` in loaders, source-only `packages/ui`, and the auth design (HttpOnly cookies, CSRF, rotating refresh with reuse detection, Argon2id, CASL) even when the feature spec only assumes a logged-in user.

Record the Active Node LTS resolved from `https://nodejs.org/dist/index.json` (first entry whose `lts` is not false): exact version for `.nvmrc`, that major for `engines` / `@types/node` / CI / Docker / README. Do not copy a Node version from memory. Corepack setup is `npm i -g corepack@latest && corepack enable` because Node 25+ does not bundle it.

{CORE_TEMPLATE}
