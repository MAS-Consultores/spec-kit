# MAS Stack Catalog

This catalog is the Phase 1 source of truth for approved MAS stacks. Stack IDs
are canonical and must be accepted exactly as written by future `--stack`
validation.

Runtime stack memory is materialized during `specify init --stack <stack-id>`
into:

- `.specify/memory/stack.md`
- `.specify/memory/security-guidelines.md`
- `.specify/memory/stack-context.md`

Source of truth in code: `src/specify_cli/mas.py` (`MAS_STACKS`).

## Catalog

| Stack ID | Display Name | Primary Use |
| --- | --- | --- |
| `cakephp2-mysql` | CakePHP 2.x + MySQL | Legacy CakePHP platform evolution |
| `moodle3` | Moodle 3.x (Legacy Exception) | Moodle 3.x maintenance under documented exception track |
| `moodle5-plugin` | Moodle 5 Plugin | Bounded Moodle 5 plugin extension work |
| `moodle5-portal` | Moodle 5 Portal | Institution-facing Moodle 5 portal workflows |
| `laravel-inertia-react` | Laravel + Inertia + React | Modern portal or admin product delivery (server-rendered) |
| `nestjs-react` | NestJS + React (API + SPA) | Decoupled API backend with SPA frontend monorepo |

## `cakephp2-mysql`

### Summary

Legacy CakePHP 2.x platform evolution backed by MySQL.

### Purpose

Legacy internal and admin-heavy web applications that must stay compatible with
the existing CakePHP 2.x estate and MySQL-backed operational data.

### When To Use

- The feature extends an existing CakePHP 2.x codebase, module, or back-office workflow instead of creating a new platform.
- The work is centered on server-rendered CRUD, reporting, operational listings, approvals, exports, or compatibility-sensitive maintenance.
- The business value depends on preserving the current authentication, deployment, hosting, and schema model instead of introducing a new application shell.

### When Not To Use

- Greenfield product surfaces that need a modern component-driven frontend or a new application platform.
- Work that would require a de facto framework migration, SPA architecture, or a separate runtime to stay maintainable.
- Heavy asynchronous integration or event-driven designs that would fight the legacy request lifecycle and operational environment.

### Core Constraints

- Preserve CakePHP 2.x conventions, controller/model/view boundaries, legacy bootstrap behavior, and established auth or ACL patterns.
- Favor conservative MySQL migrations, explicit rollback planning, and schema changes that are safe for live operational data.
- Assume legacy compatibility and hosting constraints are real unless the plan records an approved exception.

### Typical Risks

- Tight coupling in reused models, helpers, or components causing regressions far from the feature entry point.
- Slow queries, pagination regressions, or export/report timeouts on large operational datasets.
- Hidden manual SQL, ad hoc production data fixes, or fragile migrations that bypass traceable delivery controls.

### Expected Artifacts

- Controller, model, view, component, helper, shell, or config changes that stay aligned with the CakePHP 2.x structure already in use.
- Documented MySQL schema or migration impact, validation rules, indexes, seed or backfill needs, and rollback notes.
- QA coverage for permissions, admin flows, listings, filters, exports, and other operational paths touched by the feature.

### Preferred Practices

- Reuse established CakePHP components, helpers, and query patterns before introducing new abstractions.
- Keep data-model, pagination, indexing, and report/export impacts explicit in the plan and tasks.
- Make risky legacy touchpoints visible early so QA, deployment, and rollback planning are not afterthoughts.

### Security Controls

See `.specify/memory/security-guidelines.md` after init. Highlights include
`SecurityComponent`, `AuthComponent`, parameterized queries, `h()` for output,
upload MIME validation, and web-server security headers.

### `speckit-plan` Validation

- Confirm CakePHP 2.x and MySQL are fixed constraints.
- Reject unapproved framework migration or new framework introduction.
- Require schema and rollback notes for database changes.
- Require query/export performance review for reporting-heavy work.

## `moodle3`

### Summary

Legacy Moodle 3.x maintenance on the documented exception track.

### Purpose

Sustained work on Moodle 3.x estates that are not yet on Moodle 5. Changes MUST
preserve Moodle 3 stability while structuring implementation so migration to
Moodle 5 is as expedited as possible. **Moodle 3.x is not an approved company
stack**; every initiative MUST be a documented exception with rationale, scope,
approver, and migration path.

### When To Use

- The project still runs on Moodle 3.x and the change is approved under the legacy exception track with a recorded migration path to Moodle 5.
- The work is maintenance, security patching, or constrained plugin changes that must not destabilize the existing Moodle 3 instance.
- Implementation can follow Moodle 3 APIs today while mirroring Moodle 5 plugin patterns where equivalents exist.

### When Not To Use

- Greenfield products that should target Moodle 5 Plugin, Moodle 5 Portal, or Laravel + Inertia + React directly.
- New privileged features on Moodle 3 without executive security sign-off.
- Work that assumes Moodle 5-only APIs or Bootstrap 5 UI on a Moodle 3 instance.

### Core Constraints

- Record `Deviation / Exception Needed` in the plan with approver and sunset date for Moodle 5 migration.
- Apply only vendor-supported security patches for the exact minor version in use; track build numbers.
- Isolate the instance from production Moodle 5 estates.
- Use the Moodle 3 API surface available on the target instance.

### Typical Risks

- Regression on legacy themes, plugins, or customizations with narrow test coverage.
- Security exposure from unmaintained core, plugins, or missing patches.
- Rework during Moodle 5 migration when forward-compatible patterns are ignored.
- Operational confusion between isolated Moodle 3 estates and Moodle 5 production.

### Expected Artifacts

- Exception record in the plan (rationale, scope, approver, sunset date, migration path).
- Patch and minor-version inventory including build numbers.
- Plugin changes with Moodle 3-appropriate install/upgrade, capabilities, and privacy metadata.
- Milestone-level migration plan to Moodle 5 with data and capability mapping.
- QA coverage for affected Moodle 3 roles and contexts.

### Preferred Practices

- Mirror Moodle 5 plugin patterns (capabilities, Files API, privacy) when Moodle 3 supports equivalents.
- Keep diffs minimal and document forward-compatibility notes for the Moodle 5 migration team.
- Validate isolation, monitoring, and backup separation from Moodle 5 production before release.

### Security Controls

See `.specify/memory/security-guidelines.md` after init. Highlights include
documented exception approval, vendor patch discipline, instance isolation, MFA
compensating controls, capability checks, parameterized `$DB` access, safe
output formatting, Files API usage, and Privacy API metadata.

### `speckit-plan` Validation

- Confirm `Deviation / Exception Needed` with approver and Moodle 5 sunset date.
- Reject new privileged features without executive security sign-off.
- Require compensating controls evidence and migration plan attachment.
- Reject unmaintained third-party plugins without risk acceptance.

## `moodle5-plugin`

### Summary

Moodle plugin extension work inside Moodle 5.

### Purpose

Bounded Moodle 5 extensions delivered as plugins that fit Moodle's plugin APIs,
lifecycle, permissions, privacy model, and Bootstrap 5-based UI reality.

### When To Use

- The feature is a discrete Moodle capability that can live inside a standard plugin boundary with clear ownership.
- The work fits Moodle plugin APIs, capabilities, forms, events, privacy APIs, scheduled tasks, and upgrade steps.
- UI work can stay inside Moodle's rendering model, Mustache or renderer patterns, and the Bootstrap 5 conventions already present in Moodle 5.

### When Not To Use

- Requests that really require a broader portal or cross-area institutional workflow rather than a bounded plugin.
- Features that only work by patching Moodle core, replacing shared portal navigation, or ignoring Moodle's upgrade lifecycle.
- Frontend-heavy experiences that assume a custom standalone application shell instead of Moodle's plugin and Bootstrap 5 environment.

### Core Constraints

- Stay inside Moodle 5 plugin APIs, capability checks, events, privacy handling, versioning, and upgrade-step conventions.
- Assume Moodle ecosystem compatibility matters: plugin changes must coexist with the host instance, theme, and upgrade path.
- Treat Bootstrap 5, Moodle form APIs, language strings, and renderer or template conventions as the frontend baseline rather than inventing a separate UI system.

### Typical Risks

- Capability, privacy, or data-exposure regressions that leak course, user, grading, or institutional information.
- Broken installs or upgrades due to missing `version.php`, `db/install.xml`, `db/upgrade.php`, or incomplete capability and privacy changes.
- Maintenance drag from bypassing Moodle APIs or building frontend behavior that fights Moodle's rendering and theming model.

### Expected Artifacts

- Plugin files such as `version.php`, `db/install.xml`, `db/upgrade.php`, language strings, capabilities, privacy metadata, classes, forms, templates, or renderers as applicable.
- Explicit install, upgrade, rollback, and permissions notes for the plugin and any stored or derived data it introduces.
- QA coverage for teacher, student, admin, and manager workflows touched by the plugin, including Bootstrap 5 UI states where relevant.

### Preferred Practices

- Use Moodle forms, capability checks, string management, privacy APIs, and plugin upgrade paths consistently.
- Keep plugin data bounded and document any new tables, scheduled tasks, events, or privacy exports explicitly.
- Design UI additions to feel native to Moodle 5, including Bootstrap 5-based layout and predictable admin workflows.

### Security Controls

See `.specify/memory/security-guidelines.md` after init. Highlights include
`require_login`, `require_capability`, `$DB` placeholders, Files API uploads,
and Privacy API compliance.

### `speckit-plan` Validation

- Confirm plugin type and Moodle 5 APIs involved.
- Reject Moodle core modification unless approved as a deviation.
- Require capability, role, context, and privacy coverage.
- Require install/upgrade path for database changes.

## `moodle5-portal`

### Summary

Institution-facing Moodle 5 portal and cross-area operational workflows.

### Purpose

Institution-facing Moodle 5 portal work that spans multiple workflows,
operational teams, reports, and user roles while still living inside Moodle's
ecosystem and Bootstrap 5 UI constraints.

### When To Use

- The feature crosses portal navigation, reporting, enrollment, certification, institution-facing operations, or multiple Moodle touchpoints.
- Operational users need coordinated workflows, dashboards, filters, reports, exports, or support tooling that go beyond a small isolated plugin.
- The solution can remain aligned with Moodle 5 services, Bootstrap 5 UI conventions, shared permissions, and portal-wide governance.

### When Not To Use

- Small self-contained functionality that should remain a bounded Moodle plugin instead of portal work.
- Greenfield product requests that would be better served by the Laravel + Inertia + React stack rather than portal customizations.
- Features that need to ignore shared portal permissions, reporting standards, or Moodle ecosystem constraints to be viable.

### Core Constraints

- Portal behavior must fit existing Moodle 5 capabilities, service boundaries, navigation patterns, and Bootstrap 5-based operational UI expectations.
- Treat reporting, pagination, exports, cohort or enrollment flows, and institutional data sensitivity as first-class design constraints.
- Assume multi-role operational ownership: supportability, traceability, and rollout safety matter as much as the feature itself.

### Typical Risks

- Cross-area permission leakage, role confusion, or inconsistent workflow behavior between portal surfaces.
- Performance and operability failures in large listings, reports, exports, enrollments, or synchronization-heavy flows.
- Portal drift caused by ad hoc solutions that bypass shared portal conventions, observability needs, or institutional support requirements.

### Expected Artifacts

- Portal page, renderer, template, integration, permission, and reporting changes mapped clearly to the affected operational flows.
- Documented pagination, filtering, export, audit, rollout, and rollback expectations for institution-facing screens and jobs.
- QA and production validation steps that cover real administrative users, support teams, and shared portal operations.

### Preferred Practices

- Use Moodle-native capabilities and services while keeping portal workflows explicit, observable, and supportable.
- Design for backend pagination, predictable filters, reusable Bootstrap 5 admin patterns, and safe exports or batch actions.
- Document which roles, institutions, reports, and support teams are affected so delivery planning reflects operational reality.

### Security Controls

See `.specify/memory/security-guidelines.md` after init. Highlights include
institution-aware capabilities, cohort isolation, audit events, and safe file
intake through Moodle file storage.

### `speckit-plan` Validation

- Confirm portal workflows map to Moodle capabilities and context levels.
- Require pagination and export limits for large institutional listings.
- Require audit events for cohort, enrollment, role, and bulk operations.
- Validate institution isolation in QA.

## `laravel-inertia-react`

### Summary

Modern Laravel/Inertia/React portal or admin product delivery.

### Purpose

The company's standard modern web application stack for business systems that use
Laravel on the backend and Inertia with React on the frontend.

### When To Use

- The feature belongs in a modern Laravel application with server-owned routing, validation, authorization, and data access.
- The UI benefits from React components and Inertia pages while still fitting a server-driven application model instead of a disconnected SPA.
- The work can follow the company conventions around React + TypeScript starterkit usage, Tailwind, shadcn/ui, backend pagination, reusable form components, and traceable Laravel delivery practices.

### When Not To Use

- Moodle plugin or portal requests that need to live inside Moodle's ecosystem and Bootstrap 5 reality.
- Legacy CakePHP 2.x enhancements where compatibility matters more than adopting the modern stack.
- Features that only make sense as a standalone public API platform or a custom client-only application outside the current Laravel + Inertia operating model.

### Core Constraints

- Laravel remains the source of truth for routing, validation, authorization, persistence, jobs, notifications, and business rules.
- Use the React + TypeScript starterkit direction, Tailwind styling, and shadcn/ui-based reusable components rather than ad hoc UI patterns.
- Follow company defaults such as REST-style routes and controllers, `spatie/laravel-permission` for roles or permissions, Socialite where external auth or SSO is in scope, backend-driven pagination, and disciplined migrations or seeders.

### Typical Risks

- Boundary drift between controllers, requests, policies, Inertia responses, and React pages leading to duplicated or contradictory logic.
- Authorization, validation, pagination, or form-state problems caused by pushing too much behavior into the client layer.
- Inconsistent UI, brittle deployments, or broken environments when migrations, seeders, assets, permissions, or auth integrations are handled informally.

### Expected Artifacts

- Laravel routes, controllers, form requests, policies, actions or services, models, migrations, seeders, and tests as required by the feature.
- Inertia pages, React + TypeScript components, Tailwind or shadcn/ui composition, and reusable form or table components where the UI changes.
- Explicit handling of permissions, Socialite integrations when relevant, backend pagination, QA, deployment, and rollback-sensitive migrations or config changes.

### Preferred Practices

- Keep business rules, permissions, and validation centered in Laravel while using Inertia page props intentionally.
- Prefer reusable Tailwind or shadcn/ui components, typed React props, backend pagination, and shared form patterns over feature-by-feature improvisation.
- Treat migrations, seeders, permission changes, QA, and controlled deployment as part of the feature's standard artifact set rather than optional cleanup.

### Security Controls

See `.specify/memory/security-guidelines.md` after init. Highlights include
Policies/Gates, dedicated `FormRequest` classes for writes, CSRF, Inertia prop
minimization, and upload validation.

### `speckit-plan` Validation

- Confirm Laravel, Inertia, and React are the selected stack boundaries.
- Require route/controller/request/policy/page artifact coverage.
- Check server-side authorization and validation coverage.
- Require Inertia prop review for sensitive data.
- Require bounded report/export behavior and tests.

## `nestjs-react`

### Summary

Monorepo with NestJS API backend (Prisma, PostgreSQL) and React SPA frontend
communicating over HTTP.

### Purpose

Full-stack TypeScript applications structured as a monorepo with separated
backend and frontend: `apps/api` (NestJS + Prisma + PostgreSQL REST API with
OpenAPI) and `apps/web` (React + Vite SPA). Unlike Laravel + Inertia + React
which is a single server-rendered application, this stack produces a decoupled
API consumed by an independent SPA over HTTP with typed clients generated from
OpenAPI.

### When To Use

- The project requires a decoupled API that can serve multiple clients (web, mobile, third-party integrations) independently.
- The backend needs PostgreSQL persistence with Prisma ORM, explicit migrations, and clean separation from presentation concerns.
- The frontend is a React TypeScript SPA built with Vite that consumes the API with typed clients generated from OpenAPI.
- The architecture benefits from independent deployment, scaling, and team ownership of API vs. frontend.

### When Not To Use

- Moodle plugin or portal requests that need to live inside Moodle's ecosystem and Bootstrap 5 reality.
- Legacy CakePHP 2.x enhancements where compatibility matters more than adopting the modern stack.
- Laravel + Inertia + React projects where server-driven rendering with Inertia is the established pattern and a separate API is not needed.
- Simple admin panels or internal tools where a monolithic server-rendered approach (Laravel + Inertia) is more appropriate than a decoupled SPA.

### Architecture: Contrast with Laravel + Inertia + React

| Aspect | Laravel + Inertia + React | NestJS + React |
| --- | --- | --- |
| Structure | Single application | Monorepo with `apps/api` + `apps/web` |
| Rendering | Server-driven via Inertia | Decoupled SPA consuming API |
| Data flow | Controller → Inertia props → React | API endpoint → HTTP → React client |
| Deployment | Single deployment unit | Independent API and frontend deployments |
| Use case | Admin panels, internal tools, SSR apps | Multi-client APIs, independent scaling |

### Core Constraints

- Monorepo structure: `apps/api` for NestJS backend, `apps/web` for React frontend.
- `packages/contracts` for shared Zod schemas (the ONLY coupling between API and Web).
- `packages/ui` for shared shadcn/ui components.
- **pnpm** is the package manager: `pnpm-workspace.yaml` with `apps/*` and `packages/*`, `pnpm-lock.yaml` committed, `packageManager` field in root `package.json` + Corepack, `pnpm install --frozen-lockfile` in CI, workspace protocol (`workspace:*`) for internal packages. No npm or yarn lockfiles.
- NestJS with Express adapter is the API boundary; Prisma ORM is the exclusive data access layer.
- PostgreSQL is the database; schema changes require `prisma migrate` with reviewed migration files.
- Authentication uses HttpOnly cookies with CSRF protection; no JWT storage in localStorage.
- CORS is configured with explicit origin allowlist matching the frontend deployment URL.
- TypeScript strict mode is mandatory across both applications.

### Authorization: Custom AuthzModule + CASL

- **Enforcement**: Custom `AuthzModule` with `@Can()` decorator on REST routes and MCP tools; deny-by-default. Do NOT use `@nestjs/authorization`.
- **Permission Engine**: CASL (`@casl/ability`) for defining and evaluating abilities per user.
- **Permission Format**: `category:action` (e.g., `usuarios:listar`, `pedidos:aprobar`); code checks permissions, NEVER role names.
- **Categories**: One per domain module (e.g., 'Usuarios', 'Pedidos'); standard actions: `listar`, `ver`, `crear`, `editar`, `eliminar`, `exportar`, plus custom.
- **Permission Manifests**: Each domain declares `<domain>.permissions.ts` with category, actions (code + description), optional fields.
- **Manifest Sync**: `pnpm permissions:sync` idempotently upserts manifests to DB without modifying role assignments; removed permissions are flagged.
- **CI Test**: Fails if `@Can()` references undeclared permission OR if manifest action is unused.
- **Record-Level**: Conditions stored in permission rules (e.g., `{ tenantId: user.tenantId }`); filter queries with `@casl/prisma` `accessibleBy()`.
- **Field-Level**: Read/write restrictions per field; applied to response serialization and update DTO filtering.
- **Storage**: PostgreSQL via Prisma—`PermissionCategory`, `Permission` (with category ref, action code, description, conditions JSON, fields JSON), `RolePermission`, `UserRole`, optional `UserPermission`.
- **Admin UI**: Groups permissions by category; actions individually togglable.
- **Audit**: All permission changes (role assignments, grants, revokes) MUST be audited.
- **Frontend**: `@casl/react` with rules from `/me` for UI visibility only; API ALWAYS enforces.

### Unified Validation: Both Sides, Single Source

- **Zod v4.2+** is the ONLY validation library; shared schemas in `packages/contracts` are the SINGLE SOURCE OF TRUTH.
- **EVERYTHING** validated on BOTH frontend (UX) and backend (authoritative); frontend-only validation is a security hole.
- **Backend (authoritative)**: `nestjs-zod` + `ZodValidationPipe` for body, query, params, headers, file metadata, MCP inputs.
- **Frontend (UX)**: React Hook Form + `zodResolver` for forms; TanStack Router `validateSearch` for route search params.
- **Business rules** (DB-dependent) validated in services; return RFC 9457 with field-level `errors` array.
- **Frontend maps** RFC 9457 `errors` to form fields via `setError()`.
- All schemas must be strict (reject unknown keys); no duplicated hand-written rules.

### REST API with Mandatory OpenAPI

- REST is the API style; `@nestjs/swagger` + `nestjs-zod` integration for documentation.
- Every endpoint: `@ApiTags`, `@ApiOperation`, documented responses (400/401/403/404/422).
- URI versioning (`/api/v1`); RFC 9457 Problem Details for errors; standard pagination schema.
- `openapi.json` versioned in repo; `openapi-diff` in CI to detect breaking changes.
- Swagger UI at `/docs` (disabled or auth-protected in production).
- Frontend typed client generated from OpenAPI (orval, @hey-api/openapi-ts).

### MCP Support (`@nestjs/mcp`)

- Use OFFICIAL `@nestjs/mcp` package; do NOT use `@rekog/mcp-nest`.
- `McpModule.forRoot()` in AppModule; `/mcp` endpoint (Streamable HTTP, stateless).
- MCP tools in domain modules (`<domain>.mcp.ts`) calling domain services, not Prisma directly.
- `/mcp` authenticated as OAuth 2.1 resource server; same guards as REST.
- Test with in-memory MCP client from `@nestjs/mcp/testing`.

### Server-Side Pagination (Mandatory)

- ALL list/collection endpoints must be paginated server-side; no unbounded lists.
- Standard pagination Zod schema in `packages/contracts`; documented in OpenAPI.
- Default page size (e.g., 20) and max page size (e.g., 100) enforced.
- Cursor-based pagination for large/infinite datasets; offset/page for admin tables.
- Stable sorting (unique field in ORDER BY); whitelisted filter/sort fields.
- Prisma `take`/`skip` or `cursor` combined with CASL `accessibleBy()`.
- MCP list tools also paginated with same schema.

### Soft Delete (Default)

- Soft delete is mandatory when possible; models include `deletedAt DateTime?` (optionally `deletedBy`).
- Prisma Client extension intercepts `delete()` → soft delete; filters `deletedAt: null` by default.
- Explicit opt-in (`includeDeleted: true`) required to see deleted records.
- Unique constraints use partial indexes (`WHERE deletedAt IS NULL`) via migrations.
- `eliminar` = soft delete (default action); `restaurar` = restore (separate permission).
- `eliminar_permanente` = hard delete (restricted permission, audited, justified cases only).
- Cascades handled consistently: soft-deleting parent soft-deletes or detaches children.

### Comprehensive Auditing (Constitution-Level)

- **EVERY relevant action MUST be audited**—foundational stack principle, not optional.
- Audit fields: who (userId, clientId), what (action, permission), when, which (entity, recordId), before/after (masked), origin (REST/MCP/job), context (IP, userAgent, requestId).
- Audited actions: create, update, soft delete, restore, hard delete, permission/role changes, login/logout/failed auth, exports, MCP tool calls.
- Reusable `AuditModule` with NestJS interceptor and/or Prisma extension; automatic capture.
- Append-only `AuditLog` table—no update/delete operations allowed.
- Sensitive data masked: passwords, tokens, secrets, PII never logged unmasked.
- Permission category `auditoria`: `ver` (view), `exportar` (export).
- Frontend: paginated audit view with filters (entity, action, user, date range).
- Configurable retention policy; archival strategy for old records.
- Each domain module declares audited actions; new features must include audit coverage.
- Note: `audit` module may later become internal shared package/template.

### Performance Principles (Constitution-Level)

- **Performance is a first-class requirement**—foundational, not optional optimization.
- **No N+1 queries**: load relations with Prisma `include`/`select`; batch with `findMany({ where: { id: { in: ids } } })`.
- **Fetch only needed**: explicit `select` in every query; never load full entities unnecessarily.
- **Indexes**: every column in `WHERE`, `ORDER BY`, or relations indexed; review with `EXPLAIN ANALYZE`.
- **Async heavy work**: exports, emails, notifications run async; `@nestjs/event-emitter` / `@nestjs/schedule` default.
- **BullMQ + Redis OPTIONAL**: recommended only when project needs retries, durability, or volume—not mandated.
- **Short transactions**: no external calls inside tx; `createMany`/`updateMany` for bulk operations.
- **Measurable budget**: p95 < 300 ms target; Prisma slow query logging (> 100 ms threshold).
- **Lightweight frontend**: lazy routes, code splitting, virtualization, avoid re-renders; TanStack Query caching.
- **Note**: MAS manages caching strategies; stack does NOT mandate Redis/backend caching.

### Modular Architecture

**API (`apps/api`):**
- One NestJS module per bounded context under `src/modules/<domain>/`
- Each module: controller, service, Zod DTOs, MCP tools (optional), repository, tests, `index.ts` barrel
- Modules export only their public API via `@Module({ exports })` and `index.ts` barrels
- No importing another module's internals; cross-module via exported services or events
- `forwardRef()` forbidden; refactor to events or shared abstractions
- Infrastructure modules (`PrismaModule`, `AuthModule`, `McpModule`) remain thin
- No module queries another domain's Prisma tables directly

**Frontend (`apps/web`):**
- Feature-based structure under `src/features/<domain>/`
- **Router**: TanStack Router (type-safe routes, file-based, lazy-loaded)
- **Server State**: TanStack Query (cache, mutations; query hooks per feature)
- **Tables**: TanStack Table with server-side pagination/sorting/filtering; state in Router search params
- **Infinite Lists**: `useInfiniteQuery` with cursor-based pagination; TanStack Virtual for long lists
- **Global State**: Zustand for UI only; React Context for DI
- **Forms**: React Hook Form + zodResolver + schemas from `packages/contracts`
- **Styling**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest + Testing Library (unit); Playwright (E2E)
- Each feature exposes public `index.ts`; no cross-feature deep imports

**Enforcement:**
- `eslint-plugin-boundaries` or `@nx/enforce-module-boundaries` for import rules
- `madge --circular` in CI for cycles; `openapi-diff` for API changes

### Typical Risks

- Type safety gaps between Prisma models, DTOs, API responses, and frontend generated types.
- Guard or pipe misconfiguration leaving endpoints unprotected or rejecting valid requests.
- CSRF misconfiguration causing legitimate requests to fail or attacks to succeed.
- Cookie configuration errors weakening authentication security.
- Migration failures or schema drift between environments.
- Frontend-backend contract drift when OpenAPI spec is not regenerated after API changes.

### Expected Artifacts

**Monorepo Root:**
- `pnpm-workspace.yaml` with `apps/*` and `packages/*`; `pnpm-lock.yaml` committed.
- Root `package.json` with `packageManager: 'pnpm@X.Y.Z'` for Corepack.
- Shared TypeScript configuration and ESLint with boundary rules.
- CI: `pnpm install --frozen-lockfile`, `madge --circular`, `openapi-diff`, `pnpm audit`.

**API (`apps/api`):**
- Each domain as module under `src/modules/<domain>/` with controller, service, DTOs, repository, tests, and `index.ts` barrel.
- Thin infrastructure modules: `PrismaModule`, `ConfigModule`, `AuthModule`.
- Prisma schema (optionally multi-file per domain) and migrations; OpenAPI spec from `@nestjs/swagger`.
- Jest unit tests per module; e2e tests for cross-module flows.

**Frontend (`apps/web`):**
- Each domain as feature under `src/features/<domain>/` with components, hooks, api, routes, tests, and `index.ts` barrel.
- Shared UI in `src/shared/`; lazy-loaded routes per feature.
- Generated typed API client from OpenAPI spec.
- Vitest or Jest tests.

**Contracts (`packages/contracts`):**
- Shared TypeScript types and API contracts—the only coupling between API and Web.

### Preferred Practices

**Architecture & DI:**
- Organize by feature modules, not technical layers; each module: controller, service, DTOs, repository, tests together.
- Avoid circular dependencies; use events (`@nestjs/event-emitter`) or shared modules instead of `forwardRef()`.
- Single responsibility for services; avoid god services handling multiple concerns.
- Prefer constructor injection over property injection; avoid service locator pattern (`ModuleRef.get()`).
- Understand provider scopes: use SINGLETON (default) for stateless services.
- Never provide the same service in multiple modules; create a dedicated module that exports it.

**Error Handling:**
- Global exception filter for consistent RFC 9457 responses.
- Throw NestJS HTTP exceptions from services; filter converts them.
- Handle async errors properly: always `await` async operations.
- Never swallow errors silently; log with context before converting to user-safe messages.

**Performance & Database:**
- Use caching strategically when needed; invalidate on writes. MAS manages caching strategies separately.
- Lazy-load large feature modules using `LazyModuleLoader`.
- Avoid N+1 queries: use Prisma's `include`/`select` with nested relations.
- Wrap multi-step operations in `prisma.$transaction`.
- Always use `prisma migrate`; never `db push` in shared environments.
- Index frequently queried columns.

**REST API:**
- Use `nestjs-zod` for all DTOs: `createZodDto(schema)` + global `ZodValidationPipe`.
- OpenAPI from Zod schemas automatically; add `@ApiTags`, `@ApiOperation`, `@ApiResponse`.
- URI versioning (`/api/v1`); `openapi-diff` in CI for breaking changes.
- Use interceptors for cross-cutting concerns (logging, timing, transformation).

**MCP:**
- MCP tools in domain modules calling domain services, not Prisma directly.
- `/mcp` authenticated as OAuth 2.1 resource server; same guards as REST.
- Test with in-memory MCP client.

**Testing:**
- `Test.createTestingModule()` for unit tests; mock dependencies.
- E2E tests with `supertest`; use separate test database.
- Mock external services; never call real APIs in tests.

**Frontend:**
- TanStack Query for API state; query hooks per feature.
- Zustand only for UI state; never server data.
- React Hook Form + `zodResolver` with schemas from `packages/contracts`.
- Feature routes lazy-loaded; no cross-feature deep imports.

**Monorepo:**
- `packages/contracts` for shared Zod schemas (only coupling API ↔ Web).
- `madge --circular` in CI; `openapi-diff` for API contract changes.
- `eslint-plugin-boundaries` or equivalent for import enforcement.

### Security Controls

See `.specify/memory/security-guidelines.md` after init. Highlights include:

**API:** Global `AuthGuard` deny-by-default, HttpOnly cookie authentication,
CSRF token validation, `ValidationPipe` with whitelist, Prisma `select`/`omit`
for safe responses, Helmet, CORS allowlist, throttling.

**Authorization:** Custom `AuthzModule` + `@Can()` on all endpoints and MCP tools (NOT `@nestjs/authorization`),
CASL abilities per user, `@casl/prisma` `accessibleBy()` for record filtering,
field-level permissions on responses and updates, permission audit logging.

**Frontend:** No localStorage tokens, CSRF token inclusion in requests, no
`dangerouslySetInnerHTML` without sanitization, typed API clients. `@casl/react`
for UI visibility only—API always enforces authorization.

### `speckit-plan` Validation

**General:**
- Confirm monorepo structure with `apps/api` and `apps/web`.
- Verify authentication uses HttpOnly cookies with CSRF protection.
- Verify global `AuthGuard` and `@Public()` route marking.
- Confirm CORS configuration with explicit origin allowlist.
- Map endpoints to guards, DTOs, and response types with `select`/`omit`.
- Require Prisma migrations for schema changes; reject `db push` for shared environments.
- Require test coverage for guards, services, and critical flows.

**Validation:**
- Confirm Zod v4.2+ as ONLY validation library; reject class-validator/class-transformer.
- For each input (body, query, params, headers, MCP): confirm shared schema in `packages/contracts`.
- Confirm backend validates with `nestjs-zod` + `ZodValidationPipe`; never skip validation.
- Confirm frontend validates forms with `zodResolver` using SAME shared schema.
- Confirm route search params use TanStack Router `validateSearch` with Zod.
- Confirm business-rule errors return RFC 9457 with field-level `errors` array.
- Confirm frontend maps RFC 9457 `errors` to form fields.
- Confirm no duplicated hand-written validation rules; all derive from `packages/contracts`.
- Require validation tests: valid passes, invalid rejects with correct errors.

**OpenAPI:**
- Confirm `@nestjs/swagger` enabled with Zod integration.
- Verify new endpoints have `@ApiTags`, `@ApiOperation`, documented responses (400/401/403/404/422).
- Confirm `openapi.json` versioned in repo; require `openapi-diff` in CI.
- Confirm typed frontend client generated from OpenAPI.

**Pagination:**
- For each list endpoint: confirm server-side pagination; no unbounded lists.
- Confirm standard pagination Zod schema used and documented in OpenAPI.
- Confirm default and max page size enforced.
- For large datasets: confirm cursor-based pagination.
- Confirm stable sorting and whitelisted filter/sort fields.
- For MCP list tools: confirm pagination with metadata in output.

**MCP:**
- If MCP tools added, confirm using `@nestjs/mcp` (official), NOT `@rekog/mcp-nest`.
- Verify MCP tools call domain services, not Prisma directly.
- Confirm `/mcp` has same auth as REST endpoints.
- Verify MCP tools tested with in-memory client.

**Authorization:**
- For each endpoint and MCP tool: confirm required `category:action` permission declared via `@Can()`.
- For each endpoint and MCP tool: document record-level conditions (tenant, owner, status) if applicable.
- For each endpoint and MCP tool: document field-level read/write restrictions if applicable.
- For each new/changed module: confirm permission manifest exists in `<domain>.permissions.ts`.
- Confirm manifest includes soft delete actions: `eliminar` (soft), `restaurar` (restore), `eliminar_permanente` (hard).
- Confirm every `@Can()` permission is declared in a manifest (CI test must verify).
- Confirm every manifest action is used by at least one endpoint or MCP tool (CI test must verify).
- Confirm `pnpm permissions:sync` is run on deploy/seed.
- Confirm list queries use `@casl/prisma` `accessibleBy()` for record filtering.
- Confirm response serialization applies field-level permissions; restricted fields never returned.
- Confirm update DTOs filtered by writable field permissions before processing.
- Confirm permission schema exists: `PermissionCategory`, `Permission`, `RolePermission`, `UserRole` tables.
- Confirm audit logging for all permission changes.

**Soft Delete:**
- Confirm models include `deletedAt DateTime?` (optionally `deletedBy String?` for audit).
- Confirm Prisma Client extension intercepts `delete()` → soft delete, filters `deletedAt: null` by default.
- Confirm explicit opt-in (`includeDeleted: true`) required to see deleted records.
- Confirm unique constraints use partial indexes (`WHERE deletedAt IS NULL`) via migrations.
- Confirm restore action protected by `<category>:restaurar` permission.
- Confirm hard delete protected by `<category>:eliminar_permanente` with audit logging and justification.
- Confirm cascades handled consistently (parent soft-delete → children soft-deleted or detached).

**Auditing (Constitution-Level):**
- Confirm `AuditModule` exists with append-only `AuditLog` table (no update/delete).
- Confirm audit captures: userId, action, timestamp, entity, recordId, before/after (masked), origin, context.
- Confirm audited actions: create, update, soft delete, restore, hard delete, permission changes, auth events, exports, MCP calls.
- Confirm sensitive fields (passwords, tokens, secrets, PII) are masked before logging.
- Confirm permission category `auditoria` with `ver` and `exportar` actions.
- Confirm frontend has paginated audit view with filters.
- Confirm retention policy is configurable and documented.
- For each new feature: confirm audited actions are declared and implemented.
- Reject features without audit trail—auditing is a constitution-level requirement.

**Performance (Constitution-Level):**
- For each query: confirm no N+1 patterns; relations loaded with `include`/`select` or batched.
- For each query: confirm explicit `select`; reject loading full entities unnecessarily.
- For each column in `WHERE`, `ORDER BY`, or relations: confirm index exists in migrations.
- For heavy operations: confirm async execution (`@nestjs/event-emitter` or `@nestjs/schedule`).
- Confirm BullMQ/Redis only used when justified (retries, durability, volume)—not mandated by default.
- Confirm no external calls inside transactions; transactions are short.
- Confirm bulk operations use `createMany`/`updateMany`; no loops with individual operations.
- Confirm Prisma slow query logging configured; heavy queries reviewed with `EXPLAIN ANALYZE`.
- Confirm nestjs-pino structured logging with correlationId for request visibility.
- Confirm p95 < 300 ms target documented and tracked for common endpoints.
- Frontend: confirm lazy routes, code-split components, virtualized large lists.
- Note: stack does NOT mandate Redis/backend caching; MAS manages caching strategies.

**General Authorization:**
- Require tests for BOTH allowed and denied authorization cases.
- Reject role-name checks in code; require `category:action` permission checks only.

**Frontend Pagination and Lazy Loading:**
- For each table: confirm server-side pagination/sorting/filtering with TanStack Table + Query.
- Confirm page/sort/filter state in TanStack Router typed search params.
- For infinite lists: confirm `useInfiniteQuery` with cursor-based pagination.
- Reject client-side pagination of full datasets.
- Confirm feature routes are lazy-loaded with React.lazy() and Suspense.
- For long lists (>50 items): confirm TanStack Virtual virtualization.
- Confirm images use lazy loading.

**Modularity Validation:**
- Each new API feature must be a dedicated module under `src/modules/<domain>/` with documented public exports and dependencies.
- Reject direct imports of another module's internals; require barrel imports only.
- Reject `forwardRef()` usage; require events or refactoring.
- Reject service locator pattern (dynamic `ModuleRef.get()`); require constructor injection.
- Each new frontend feature must be under `src/features/<domain>/` with public `index.ts` and no cross-feature deep imports.
- Confirm feature routes are lazy-loaded.
- Confirm `packages/contracts` is the only coupling between API and Web.
- Require ESLint boundary rules or dependency-cruiser in CI.
