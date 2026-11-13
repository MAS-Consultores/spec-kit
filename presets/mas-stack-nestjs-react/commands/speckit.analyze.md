---
description: NestJS + React analysis checks on top of core analyze.
strategy: wrap
---

## NestJS + React Analysis Requirements

After the core analysis, read `.specify/memory/stack-context.md` and `tasks.md`.

Mark **CRITICAL** when the project has no `AuthModule` and `tasks.md` lacks a blocking auth phase covering login, HttpOnly cookies, CSRF, rotating refresh with reuse detection, roles, and a user seed.

Also mark **CRITICAL** when `tasks.md` has no tasks for `openapi:generate`, `api-client:generate`, or an AST-based CASL check in `pnpm verify`, or when it still requires `ensureQueryData`, `prisma/prisma.config.ts`, `MongoAbility` / `createMongoAbility` for Prisma queries, or gitignoring `routeTree.gen.ts`.

Mark **CRITICAL** when `tasks.md` is missing any of these test tasks:

- API e2e with supertest against real Postgres (not a mocked Prisma client): at least one test per REST endpoint, including 401, 403 from CASL, refresh-token rotation that rejects reuse, and throttling (429)
- MCP e2e with Bearer and scopes against that same Postgres: at least one test per MCP tool (401 without a token, denial for a missing scope, success with the required scope)
- Playwright plus axe-core: at least one spec per user story, with `screenshot`, `video`, and `trace` set to `'off'`
- Unit tests for each domain service, each guard, and each CASL policy

A tasks file that only lists a few unit tests or a single Playwright spec fails this gate.

`/speckit.analyze` runs before implement and is read-only, so a missing `.nvmrc` is expected and is **not** by itself CRITICAL. Mark **CRITICAL** (not a warning) when `tasks.md` has no setup task that creates `.nvmrc` with the exact Active LTS version. When `.nvmrc` already exists, mark **CRITICAL** only when its major differs from that Active LTS. Also mark **CRITICAL** when the Node major in an existing `engines.node`, `@types/node`, CI, Docker, or the README differs from that Active LTS. Resolve the release at analysis time from `https://nodejs.org/dist/index.json` only: first entry whose `lts` is not `false` (newest-first file; highest Active LTS semver). Do not use memory, nodejs.org prose pages, Current, odd majors, or alpha/beta/rc. The setup task must write that exact version (strip `v`); the other pins must use its major. One-liner: `curl -s https://nodejs.org/dist/index.json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const hit=JSON.parse(s).find(e=>e.lts!==false);if(!hit){console.error("no Active LTS");process.exit(1)}const exact=hit.version.replace(/^v/,"");console.log(exact);console.log(exact.split(".")[0])})'`. As of 2026-11-13 the example is `26.13.1` / major `26` (Lithium); Node 22 is Maintenance. The rule is the index, not a hardcoded `26`.

{CORE_TEMPLATE}
