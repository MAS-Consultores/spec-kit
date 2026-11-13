
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
