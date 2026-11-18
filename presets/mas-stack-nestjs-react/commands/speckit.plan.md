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

function migrationDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const value = env["DATABASE_URL"];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("DATABASE_URL is required for prisma migrate");
  }
  return value;
}

export default defineConfig({
  schema: "prisma/schema",
  datasource: {
    url: migrationDatabaseUrl(process.env),
  },
  migrations: {
    seed: "node --import tsx prisma/seed.ts",
  },
});
```

## NestJS + React Planning Requirements

Resolve contradictions between `spec.md` and `.specify/memory/stack-context.md` inside `MAS Stack Validation` before writing design artifacts.

Locale rule: stack context does not override the spec. If the spec says es-CL is the only required locale, plan only `locales/es-CL.json` and do not add `en.json` or a language switcher. Record the decision as `PASS` with that note. Add `en` only when the spec requires it.

`quickstart.md` commands MUST use `pnpm --filter` with the `name` from each workspace `package.json` (for example `@demo/api` and `@demo/web`). Do not use the directory names `api` or `web` unless that string is the package name. `quickstart.md` MUST include `pnpm dev` from the repo root, which loads the root `.env` and starts the API and the web app together.

The plan MUST follow **Modularidad estricta** in the stack constitution: one Nest module per domain, repository ownership, per-domain contracts and Prisma files, lazy feature routes, and `pnpm gen:module` when a domain is new.

When the spec ports an HTML prototype, the plan MUST follow **Prototype fidelity** in the stack constitution. Plan the token file, the brand manifest, self-hosted fonts, literal motion, and the shell design. Do not plan porting CDN, jQuery, sim-bar, or prototype scripts. Do not plan a text logo or skeleton default colors when the prototype defines the value. Plan `pnpm test:fidelity` on `specs/<feature>/fidelity-map.json`.

State `apps/api/prisma.config.ts` at the package root, `queryClient.query` in loaders, source-only `packages/ui`, and the auth design (HttpOnly cookies, CSRF, rotating refresh with reuse detection, Argon2id, CASL) even when the feature spec only assumes a logged-in user.

When the feature includes authentication (login, account recovery, one-time passwords or tokens, session issuance, password change, or mail that carries auth secrets), `plan.md` MUST include this checklist. Mark each item covered, or not applicable with a reason:

- [ ] One-time passwords and tokens are single-use: consumed atomically on first success and invalidated by any later successful login or password change
- [ ] Account recovery and login never reveal account existence: same status, body, and similar latency; hashing, database writes, and email cannot change the response
- [ ] Lockout and rate-limit counters update atomically (database increment or conditional update), never read-modify-write
- [ ] Client IP for audit and rate limits comes from `request.ip`; `X-Forwarded-For` is trusted only through an explicit configured trust-proxy setting, and values are validated
- [ ] A session that must change its password, or is otherwise restricted, carries no business scopes; guards allow only change-password, logout, and me; refresh does not reissue scopes
- [ ] Outbound SMTP that carries secrets requires TLS (`secure` or `requireTLS`); plaintext only for a loopback dev mail catcher
- [ ] Password change and session revocation invalidate existing access tokens (reject tokens issued before `passwordChangedAt` or an older token version)
- [ ] Tests cover every rule that applies

Do not plan an example slice. The reference has no notes or widgets module, no demonstration screen, and no `example.com` seed. Identity tables in the skeleton are generic auth infrastructure and stay empty until a feature defines accounts. Domain models, screens, and seeds come from the feature spec.

Database names stay English. Prisma models are PascalCase singular. Physical tables are snake_case plural through `@@map` and physical columns are snake_case through `@map`. Do not plan Spanglish identifiers or Spanish enum values in the schema. A field that must match an external source system 1:1 may keep that source name on the model; its column is still snake_case and the plan records the exception.

Record the Active Node LTS resolved from `https://nodejs.org/dist/index.json` (first entry whose `lts` is not false): exact version for `.nvmrc`, that major for `engines` / `@types/node` / CI / Docker / README. Do not copy a Node version from memory. Corepack setup is `npm i -g corepack@latest && corepack enable` because Node 25+ does not bundle it.

{CORE_TEMPLATE}
