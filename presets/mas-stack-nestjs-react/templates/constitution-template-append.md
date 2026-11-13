
## NestJS + React Stack Constitution

The following stack-specific principles are constitution-level requirements for all NestJS + React projects. See `stack.md` and `stack-context.md` for implementation details.

### Strict TypeScript

TypeScript strict mode with ZERO `any` tolerance:
- MUST NOT use `: any`, `as any`, or `<any>` anywhere in source code
- ESLint MUST use `typescript-eslint/strictTypeChecked` with `@typescript-eslint/no-explicit-any: 'error'`
- MUST NOT disable, set to warn, or use `eslint-disable` to bypass no-explicit-any
- ESLint ignores generated files (`routeTree.gen.ts`, `generated/prisma/**`). `routeTree.gen.ts` MUST still be committed so `tsc --noEmit` works on a clean clone
- `tsconfig.json` includes sources and tests for the editor and `projectService`; `tsconfig.build.json` includes only `src` for `nest build`
- API dev, e2e, and OpenAPI MUST run on the SWC build: `nest-cli.json` `builder: "swc"` and `typeCheck: true`; `dev` is `nest start --watch`; `start:e2e` is `nest build && node dist/main.js`; `openapi:generate` sets `OPENAPI_GENERATE=1` before importing compiled `main`. `tsx src/main.ts` is forbidden for the Nest process
- `@demo/contracts` (and any internal TypeScript package imported with `.js` specifiers) MUST ship compiled `exports`. `packages/ui` stays source-only
- `ThrottlerGuard` MUST be registered as `{ provide: APP_GUARD, useClass: ThrottlerGuard }` in a module that imports `ThrottlerModule`. Do not construct it with `new` (`Reflector` stays undefined under SWC)

### Latest Stable Versions

Always use the latest stable release, never prereleases:
- MUST respect minimum major versions: @nestjs/core 12, prisma 7, zod 4, react 19, @casl/ability 7, @tanstack/react-table 9
- MUST NOT downgrade to resolve peer dependency warnings
- A new project MUST copy `package.json` files and `pnpm-lock.yaml` from `.specify/reference/` (installed by `specify init --stack nestjs-react`). Those are the versions that passed CI. Do not resolve versions at generation time and do not run `npm view` to pick them
- `npm view` is only for the Renovate pull request that updates the skeleton in this preset. That PR is the only place versions move, and it must pass the NestJS React smoke workflow before merge
- MUST reject prereleases; the lockfile is the proof the set is stable
- TypeScript MAY be pinned below absolute latest when `typescript-eslint`'s peer range requires it: use the highest stable TypeScript that satisfies that peer, and document the exception
- `scripts/check-casl.ts` is a separate pin: it MUST run on the latest TypeScript 5.x stable (`typescript@5`, exact `5.9.3` as of 2026-11-13). TypeScript 7's package root no longer exports `createSourceFile`, so the AST walk cannot load `typescript@7`. This is not a prerelease and it does not lower the application's TypeScript. Revisit the pin when a stable TypeScript release exports an equivalent parser API; until then do not point the script at TypeScript 7
- `prisma` and `@prisma/client` MUST be the same exact Prisma 7.x stable version
- `pnpm-workspace.yaml` MUST list `allowBuilds` explicitly (`true` for `prisma`, `@prisma/engines`, `argon2`, `esbuild`, `@swc/core`, `msw`; `false` for `@scarf/scarf`). A later package whose install script is not listed fails pnpm 12: add that name in the same change, `true` only when the script is required, never via `pnpm approve-builds --all`
- pnpm 12 ignores `package.json#pnpm.peerDependencyRules`. Peer exceptions live in `pnpm-workspace.yaml` under `peerDependencyRules.allowedVersions`
- pnpm 12 writes `minimumReleaseAgeExclude` into `pnpm-workspace.yaml` for packages newer than the release-age gate and prints `Agent skills awaiting approval` for packages that ship skills (for example `@tanstack/react-table` and `@tanstack/table-core`). Approve those named packages only: `pnpm approve @tanstack/react-table @tanstack/table-core --yes`, which sets `permissions.<name>.skills: true`. Do not run `pnpm approve --all` or `pnpm approve-builds --all`
- `prisma db seed` loads `DATABASE_URL` from the environment and from `.env`. E2E MUST set `SEED_DATABASE_URL` to the e2e database. `prisma.config.ts` uses `datasource.url: process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL` and `migrations.seed`. Do not use `migrate.adapter`
- shadcn `init` / `add` MUST be non-interactive (`--yes` and a pre-generated `components.json` with aliases that do not produce `src/src` or `import ... from "cn"`). A post-step (`scripts/check-shadcn.mjs`) MUST fail the task if shadcn asked a question or generated those paths
- The global `JwtAuthGuard` MUST skip non-HTTP contexts (`context.getType() !== "http"`) so it does not intercept MCP. Tool `inputSchema` MUST be a Zod object the MCP SDK accepts so validation does not throw before the handler. Insufficient scope MUST be the MCP `insufficient_scope` error
- `@casl/ability` 7.1.3 does not export `PureAbility`. `createPrismaAbility` is overloaded, so the compiling type is `ReturnType<typeof createAppAbility>` where `createAppAbility` calls `createPrismaAbility<[string, string]>([])`
- `QueryClient` is imported from `@tanstack/query-core` (the `.d.ts` of `@tanstack/react-query` re-exports hooks, not the class). `stockFeatures` and `createCoreRowModel` are imported from `@tanstack/table-core`
- The CASL checker accepts `permissions.ts` and `*.permissions.ts`
- Playwright `webServer.url` MUST be a GET that returns 2xx. The API pattern includes `GET /api/v1/health`. E2E global setup truncates the e2e database and the servers bind free ports
- `/speckit.analyze` does not commit. When the repo is born empty, specify and clarify commits are the first commits and they live on the feature branch

### Compilable reference snippets

These fences are extracted and typechecked against the skeleton lockfile. Keep them complete.

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

```typescript
import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") {
      return true;
    }
    return false;
  }
}
```

```typescript
import { createPrismaAbility } from "@casl/prisma";

export function createAppAbility() {
  return createPrismaAbility<[string, string]>([]);
}

export type AppAbility = ReturnType<typeof createAppAbility>;
```

```typescript
import { QueryClient } from "@tanstack/query-core";
import { stockFeatures } from "@tanstack/table-core";

export const queryClient = new QueryClient();
export const features = { ...stockFeatures };
```

### Node.js Active LTS

Node MUST be the current Active LTS, resolved at generation and analysis time. The single source of truth is `https://nodejs.org/dist/index.json`:
- Algorithm: entries whose `lts` is not `false`, then the highest semver. The file is newest-first, so that is the first such entry. Not from memory, not from nodejs.org prose pages, never odd/Current/alpha/beta/rc
- `.nvmrc` MUST exist and MUST contain that exact version (strip the leading `v`)
- `engines.node` MUST be `>=<that major>`; `@types/node`, CI, Docker, and the README MUST use the same major
- Example only, as of 2026-11-13: exact `26.13.1` (Lithium), `engines` `>=26`. Node 22 is Maintenance. The rule is the index, not a hardcoded `26`
- Resolve with: `curl -s https://nodejs.org/dist/index.json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const hit=JSON.parse(s).find(e=>e.lts!==false);if(!hit){console.error("no Active LTS");process.exit(1)}const exact=hit.version.replace(/^v/,"");console.log(exact);console.log(exact.split(".")[0])})'`
- Node 25+ does not bundle Corepack. Do not install it under `/usr`. Linux and macOS: `npm config set prefix ~/.local` and prepend `~/.local/bin` to `PATH`, or use nvm. Windows: nvm-windows, or `npm config set prefix %USERPROFILE%\\.local` and add that directory to the user PATH. Then `npm i -g corepack@latest && corepack enable` (or install the exact `pnpm@X.Y.Z` globally with that prefix). `packageManager: pnpm@X.Y.Z` stays an exact pin
- `/speckit.analyze` runs before implement and is read-only. A missing `.nvmrc` is **not** by itself CRITICAL. Analyze MUST mark **CRITICAL** when `tasks.md` has no setup task that creates `.nvmrc` with the exact index-resolved Active LTS version. When `.nvmrc` already exists, a major that differs from that Active LTS is **CRITICAL**
- Prisma 7.x stable `engines.node` is `^20.19 || ^22.12 || >=24.0` (verified on the latest 7.x stable, not a Prisma 8 prerelease). The Active LTS major is inside that range. The CLI still prints a warning for majors above 24 (including Node 26) and does not exit. That warning is a known exception and MUST NOT block install, verify, or CI. Do not pin an older LTS to hide it

### Cursor Agent command files

With `--integration cursor-agent`, Spec Kit commands are installed as `.cursor/skills/speckit-*/SKILL.md`. They are not installed under `.cursor/commands`.

### Real Tests and Hard Gates

Tests MUST exercise real production code; gates MUST pass before merge:
- MUST NOT write tautological tests that only exercise helpers defined in the same test file
- MUST NOT close a gate with skipped tests (`.skip`, `.todo`, `.only`, `xit`, `xdescribe`)—skipped count MUST be 0
- ALL gates MUST pass with real output as evidence: typecheck, lint, unit tests, API e2e, MCP e2e, Playwright + axe-core, build, `pnpm audit` (no high/critical), `madge --circular`
- Minimums, all required: at least one supertest e2e per REST endpoint against real Postgres, covering 401, CASL 403, refresh-token rotation, and throttling 429; at least one MCP e2e per tool with Bearer and scopes against that Postgres; at least one Playwright spec with axe-core per user story (`screenshot`, `video`, and `trace` `'off'`); at least one unit test per domain service, guard, and CASL policy
- `/speckit.analyze` MUST mark **CRITICAL** when `tasks.md` omits any of those tasks. `/speckit.implement` MUST NOT declare the work finished without running them

### No Screenshots in Tests

Playwright and Vitest MUST NOT generate or store screenshots or image snapshots:
- `playwright.config.ts` MUST set `screenshot: 'off'`
- MUST NOT use `page.screenshot()`, `toHaveScreenshot()`, or image snapshot matchers

### No Ad Hoc Screenshots by AI Agents

AI agents MUST NOT take, generate, or save ad hoc screenshots during `/speckit.implement`, demos, or pilots—not with Playwright, not with a browser, and not with scripts. Visual review is performed by a human (revisión visual humana). Playwright + axe-core gates, including computed Tailwind style verification, remain mandatory and MUST run without screenshots (`screenshot: 'off'`; no `toHaveScreenshot()`; no `page.screenshot()`).

### Authentication and MCP Security

Authentication uses `@nestjs/passport` + `@nestjs/jwt` with CASL authorization:
- If the project has no AuthModule, tasks MUST add a blocking auth phase (login, HttpOnly cookies, CSRF, rotating refresh with reuse detection, roles, user seed) and analyze MUST mark its absence CRITICAL
- Access tokens MUST be short-lived (~15 min); refresh tokens MUST rotate and be stored in HttpOnly + Secure + SameSite cookies with CSRF protection
- MCP registration MUST use `McpModule.forRootAsync({ decorators: [Public(), SkipCsrf()] })` so a missing Bearer token is 401, not a CSRF 403
- Passwords MUST be hashed with Argon2id; login endpoints MUST have throttling
- MCP endpoints MUST require Bearer token: missing or invalid token MUST return exactly 401 with `WWW-Authenticate: Bearer` header
- `apps/api` MUST declare `@modelcontextprotocol/client` as a devDependency (latest stable). `@nestjs/mcp/testing` imports it and does not declare the dependency
- Secrets MUST be read at runtime from Zod-validated config; MUST NOT use hardcoded fallbacks

### Frontend Stack

React SPA with mandatory libraries and patterns:
- MUST depend on the `shadcn` package (latest stable) in `packages/ui` and `apps/web` because the CSS imports `shadcn/tailwind.css`
- MUST run `shadcn init` and then a non-interactive `shadcn add button input label card badge dialog select dropdown-menu table skeleton form --yes --overwrite`. `init` does not generate primitives
- Primitives live in `packages/ui/src/components/`, exported by the package, consumed by `apps/web`
- MUST NOT reimplement shadcn/ui primitives by hand (Button, Input, Dialog, Table, Card, Badge, Select, Dropdown, etc.)
- MUST use Tailwind CSS only for custom styling, layouts, and spacing—not to rebuild existing primitives
- `apps/web/src/index.css` MUST include `@source` directive pointing to `packages/ui/src` for Tailwind 4 to generate classes used by shared primitives
- MUST use TanStack Router with file-based routing
- MUST use TanStack Query for all server state (no duplicating API data in Zustand)
- Route loaders MUST call `queryClient.query(options)` (`ensureQueryData` and `prefetchQuery` are deprecated and fail `no-deprecated`)
- `packages/ui` MUST be source-only (exports point at `src`, not `dist`)
- MUST use TanStack Table v9 API (`useTable` + `stockFeatures`, not legacy `useReactTable`)
- At least one Playwright spec MUST verify computed styles (e.g., button background not transparent, cell padding > 0) to catch CSS generation failures

### Comprehensive Auditing

Every relevant action MUST be audited—this is foundational, not optional:
- Audited actions: create, update, soft delete, restore, hard delete, permission changes, auth events, exports, MCP tool calls
- Append-only `AuditLog` enforced at DB level (role with only INSERT/SELECT or trigger)
- Audit write in same `$transaction` as business operation or via outbox pattern
- Sensitive data masked; retention via monthly partitions

### Soft Delete by Default

Soft delete is mandatory for all business entities:
- Models include `deletedAt DateTime?` and `deletedBy String?`
- Hard delete requires `<category>:eliminar_permanente` permission and justification
- Extension order: `$extends(createCaslExtension()).$extends(softDeleteExtension)`

### Performance Principles

Performance is a first-class requirement:
- No N+1 queries; explicit `select`; indexed columns
- Server-side pagination mandatory (default 20, max 100)
- Async heavy work; short transactions; p95 < 300 ms target

### Validation Single Source of Truth

Zod schemas in `packages/contracts` are the ONLY validation source:
- Validate on BOTH frontend and backend
- Request schemas strict; response schemas strip unknown
- RFC 9457 Problem Details for errors
