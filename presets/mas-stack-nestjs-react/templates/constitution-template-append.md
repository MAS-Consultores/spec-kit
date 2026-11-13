
## NestJS + React Stack Constitution

The following stack-specific principles are constitution-level requirements for all NestJS + React projects. See `stack.md` and `stack-context.md` for implementation details.

### Strict TypeScript

TypeScript strict mode with ZERO `any` tolerance:
- MUST NOT use `: any`, `as any`, or `<any>` anywhere in source code
- ESLint MUST use `typescript-eslint/strictTypeChecked` with `@typescript-eslint/no-explicit-any: 'error'`
- MUST NOT disable, set to warn, or use `eslint-disable` to bypass no-explicit-any
- ESLint ignores generated files (`routeTree.gen.ts`, `generated/prisma/**`). `routeTree.gen.ts` MUST still be committed so `tsc --noEmit` works on a clean clone
- `tsconfig.json` includes sources and tests for the editor and `projectService`; `tsconfig.build.json` includes only `src` for `nest build`

### Latest Stable Versions

Always use the latest stable release, never prereleases:
- MUST respect minimum major versions: @nestjs/core 12, prisma 7, zod 4, react 19, @casl/ability 7, @tanstack/react-table 9
- MUST NOT downgrade to resolve peer dependency warnings
- MUST resolve versions at implementation time with `npm view <pkg> version` and reject prereleases; MUST NOT copy version numbers from templates or claim a version is missing without that output
- TypeScript MAY be pinned below absolute latest when `typescript-eslint`'s peer range requires it: use the highest stable TypeScript that satisfies that peer, and document the exception
- `prisma` and `@prisma/client` MUST be the same exact Prisma 7.x stable version

### Node.js Active LTS

Node MUST be the current Active LTS, resolved at generation and analysis time. The single source of truth is `https://nodejs.org/dist/index.json`:
- Algorithm: entries whose `lts` is not `false`, then the highest semver. The file is newest-first, so that is the first such entry. Not from memory, not from nodejs.org prose pages, never odd/Current/alpha/beta/rc
- `.nvmrc` MUST exist and MUST contain that exact version (strip the leading `v`)
- `engines.node` MUST be `>=<that major>`; `@types/node`, CI, Docker, and the README MUST use the same major
- Example only, as of 2026-11-13: exact `26.13.1` (Lithium), `engines` `>=26`. Node 22 is Maintenance. The rule is the index, not a hardcoded `26`
- Resolve with: `curl -s https://nodejs.org/dist/index.json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const hit=JSON.parse(s).find(e=>e.lts!==false);if(!hit){console.error("no Active LTS");process.exit(1)}const exact=hit.version.replace(/^v/,"");console.log(exact);console.log(exact.split(".")[0])})'`
- Node 25+ does not bundle Corepack. Setup MUST be `npm i -g corepack@latest && corepack enable` (or install the exact `pnpm@X.Y.Z` globally). `packageManager: pnpm@X.Y.Z` stays an exact pin
- `/speckit.analyze` runs before implement and is read-only. A missing `.nvmrc` is **not** by itself CRITICAL. Analyze MUST mark **CRITICAL** when `tasks.md` has no setup task that creates `.nvmrc` with the exact index-resolved Active LTS version. When `.nvmrc` already exists, a major that differs from that Active LTS is **CRITICAL**
- Prisma 7.x stable `engines.node` is `^20.19 || ^22.12 || >=24.0` (verified on the latest 7.x stable, not a Prisma 8 prerelease). The Active LTS major is inside that range. The CLI still prints a warning for majors above 24 (including Node 26) and does not exit. That warning is a known exception and MUST NOT block install, verify, or CI. Do not pin an older LTS to hide it

### Cursor Agent command files

With `--integration cursor-agent`, Spec Kit commands are installed as `.cursor/skills/speckit-*/SKILL.md`. They are not installed under `.cursor/commands`.

### Real Tests and Hard Gates

Tests MUST exercise real production code; gates MUST pass before merge:
- MUST NOT write tautological tests that only exercise helpers defined in the same test file
- MUST NOT close a gate with skipped tests (`.skip`, `.todo`, `.only`, `xit`, `xdescribe`)—skipped count MUST be 0
- ALL gates MUST pass with real output as evidence: typecheck, lint, unit tests, API e2e, MCP e2e, Playwright + axe-core, build, `pnpm audit` (no high/critical), `madge --circular`

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
- Secrets MUST be read at runtime from Zod-validated config; MUST NOT use hardcoded fallbacks

### Frontend Stack

React SPA with mandatory libraries and patterns:
- MUST use shadcn/ui initialized via official CLI (`shadcn init`) in `packages/ui` (shared primitives) and `apps/web`
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
