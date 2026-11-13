---
description: NestJS + React analysis checks on top of core analyze.
strategy: wrap
---

## NestJS + React Analysis Requirements

After the core analysis, read `.specify/memory/stack-context.md` and `tasks.md`.

Mark **CRITICAL** when the project has no `AuthModule` and `tasks.md` lacks a blocking auth phase covering login, HttpOnly cookies, CSRF, rotating refresh with reuse detection, roles, and a user seed.

Also mark **CRITICAL** when `tasks.md` has no tasks for `openapi:generate`, `api-client:generate`, or an AST-based CASL check in `pnpm verify`, or when it still requires `ensureQueryData`, `prisma/prisma.config.ts`, `MongoAbility` / `createMongoAbility` for Prisma queries, or gitignoring `routeTree.gen.ts`.

Mark **CRITICAL** (not a warning) when `.nvmrc` is missing, or when the Node major in `.nvmrc`, `engines.node`, `@types/node`, CI, Docker, or the README differs from the current Active LTS. Resolve that release at analysis time from `https://nodejs.org/dist/index.json` only: first entry whose `lts` is not `false` (newest-first file; highest Active LTS semver). Do not use memory, nodejs.org prose pages, Current, odd majors, or alpha/beta/rc. `.nvmrc` must be that exact version (strip `v`); the others must use its major. One-liner: `curl -s https://nodejs.org/dist/index.json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const hit=JSON.parse(s).find(e=>e.lts!==false);if(!hit){console.error("no Active LTS");process.exit(1)}const exact=hit.version.replace(/^v/,"");console.log(exact);console.log(exact.split(".")[0])})'`. As of 2026-11-13 the example is `26.13.1` / major `26` (Lithium); Node 22 is Maintenance. The rule is the index, not a hardcoded `26`.

{CORE_TEMPLATE}
