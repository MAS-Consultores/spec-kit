# Security Guidelines Model

Security guidance in the MAS fork is split into two layers:

- company-wide security principles in `mas-core` and
  `.specify/memory/constitution.md`;
- stack-specific security guidelines in each stack preset and
  `.specify/memory/security-guidelines.md`.

This prevents the shared constitution from becoming a large framework manual
while keeping concrete security checks available to planning and downstream
tasks.

## Company-Wide Security Principles

Company-wide principles apply to every stack. They belong in `mas-core`.

They should cover:

- authentication and authorization must be explicit;
- least privilege for administrative, coordinator, learner, and reporting roles;
- sensitive educational, personal, grade, course, and participation data must be
  minimized and protected;
- user-visible and administrative actions must be traceable where operationally
  relevant;
- data models and integrity constraints must be explicit;
- reports and exports must be access-controlled, bounded, and auditable;
- delivery plans must include rollback readiness for risky changes.

These principles should be stable and independent of implementation framework.

## Stack-Specific Guidelines

Stack-specific guidelines belong in stack presets because they vary by
framework, integration boundary, and data surface.

They should cover:

- concrete permission APIs or authorization mechanisms;
- framework-specific validation paths;
- session, SSO, or plugin entry-point concerns;
- stack-specific sensitive data exposure risks;
- prohibited shortcuts and high-risk implementation patterns;
- plan checks that can be evaluated before coding begins.

During `specify init --stack <stack-id>`, the selected stack preset should render
or copy its security profile into `.specify/memory/security-guidelines.md`.

## Plan Consumption

`speckit-plan` must load `.specify/memory/security-guidelines.md` and validate
the implementation plan against it. Validation should answer:

- Which security guidelines apply to this feature?
- Which design artifacts prove they are handled?
- Which guidelines are not applicable, and why?
- Are any deviations present?
- Are additional tasks required for controls, tests, audit, or rollback?

Downstream `speckit-tasks` should convert relevant guidelines into concrete
tasks, such as policy tests, capability checks, privacy provider updates, export
limits, or regression tests.

## Stack Profiles

### `cakephp2-mysql`

Security profile:

Legacy CakePHP 2.x systems often contain older request handling, authorization,
query, and export patterns. Changes must improve safety without breaking legacy
compatibility.

Required guidelines:

- Validate request data with CakePHP 2.x-compatible validation mechanisms.
- Use parameterized queries, ORM/query builder paths, or carefully reviewed
  prepared statements.
- Treat raw SQL as high risk and require justification.
- Check authorization for each controller action, administrative flow, report,
  and export.
- Preserve session and authentication compatibility unless the plan explicitly
  changes it.
- Review file upload, generated file, and export paths for traversal, leakage,
  and retention risks.
- Include regression tests or manual regression coverage for modified legacy
  flows.

Plan should validate:

- touched controllers/models/views/components are named;
- SQL and schema changes are controlled and reversible;
- reports/exports have role checks and performance bounds;
- legacy auth/session behavior remains compatible.

### `moodle3`

Security profile:

Moodle 3.x is not an approved company stack. Work MUST be treated as a documented
exception with rationale, scope, approver, and migration path to Moodle 5.

Required guidelines:

- Record `Deviation / Exception Needed` in the plan with approver and sunset date.
- Apply only vendor-supported security patches for the exact minor version; track build numbers.
- Isolate the instance from production Moodle 5 estates.
- Restrict administrative access; enforce MFA at the identity provider or VPN when Moodle 3 lacks native MFA.
- Use `require_login` and `require_capability` on every entrypoint for the Moodle 3 API surface in use.
- Use Moodle database APIs with placeholders; use `format_string` / `format_text` for output.
- Use the Files API and `pluginfile.php`; declare Privacy API metadata where personal data is stored.
- Do not ship new privileged features without executive security sign-off.
- Do not install unmaintained third-party plugins without documented risk acceptance.

Plan should validate:

- exception record, compensating controls, and migration date are present;
- migration plan to Moodle 5 includes data and capability mapping;
- patch level and isolation measures are documented.

### `moodle5-plugin`

Security profile:

Moodle plugins operate inside Moodle's permission, context, privacy, event, and
upgrade model. Security failures can expose academic, personal, grade,
enrollment, or course participation data.

Required guidelines:

- Define and use Moodle capabilities for each entry point.
- Check context and role scope before showing, changing, exporting, or syncing
  data.
- Do not modify Moodle core.
- Use Moodle APIs for users, courses, enrollments, grades, files, forms, output,
  and database access where applicable.
- Provide privacy provider behavior for personal data.
- Protect AJAX, external services, observers, and scheduled tasks with
  authentication and capability checks.
- Include install/upgrade safety for plugin database changes.

Plan should validate:

- plugin type and Moodle APIs are named;
- capabilities and role mappings are documented;
- privacy provider impact is addressed;
- install/upgrade path is present for database changes;
- supported Moodle roles are covered by tests.

### `moodle5-portal`

Security profile:

Moodle portals sit outside or adjacent to Moodle and must preserve Moodle
identity, visibility, and data access boundaries while adding business-specific
flows.

Required guidelines:

- Define authentication, SSO, session, and identity mapping.
- Mirror Moodle visibility constraints for courses, cohorts, roles, users,
  grades, and reports.
- Avoid direct Moodle database coupling unless approved as a deviation.
- Define data ownership, retention, freshness, and deletion behavior for copied
  Moodle-origin data.
- Bound report and export access by role, business context, and Moodle
  visibility.
- Audit cross-system actions that affect learners, courses, enrollments, grades,
  or coordinator decisions.
- Define failure modes for Moodle API, SSO, sync, and background jobs.

Plan should validate:

- integration boundaries are explicit;
- SSO/session risks and identity mapping are handled;
- Moodle-origin data exposure is minimized;
- sync and failure behavior is documented;
- exports and dashboards enforce Moodle visibility.

### `laravel-inertia-react`

Security profile:

Laravel/Inertia/React portals concentrate security at Laravel routes,
middleware, validation, policies, sessions, and the server-provided Inertia prop
boundary. The React UI must never be the source of authorization truth.

Required guidelines:

- Enforce authorization server-side through policies, gates, middleware, or
  controller-level checks.
- Validate all request payloads, filters, uploads, and export parameters through
  form requests or equivalent validators.
- Keep sensitive data out of Inertia props unless required and authorized.
- Protect CSRF, session, SSO callback, password reset, file upload, and export
  flows.
- Define role-based access for administrative and coordinator actions.
- Bound report queries and exports by role, scope, size, time range, and audit
  requirements.
- Add tests for policies, request validation, critical feature flows, and
  sensitive page props.

Plan should validate:

- routes, controllers, requests, policies, and Inertia pages are mapped;
- server authorization covers every protected action;
- validation covers all input surfaces;
- Inertia props are reviewed for sensitive data leakage;
- report/export controls are explicit.

### `nestjs-react`

Security profile:

NestJS/Prisma/React applications with decoupled API and SPA architecture
concentrate backend security at NestJS guards, pipes, interceptors, cookie-based
authentication, and CSRF validation. The React SPA must treat all authorization
as advisory; the API enforces access control. Prisma prevents SQL injection when
used correctly, but raw queries and exposed model fields remain risks.

Required guidelines (API — `apps/api`):

- Apply a global `AuthGuard` that denies by default; mark public routes with `@Public()`.
- Implement session-based authentication with HttpOnly, Secure, SameSite=Lax cookies.
- Generate and validate CSRF tokens for all state-changing requests.

Authorization (`@nestjs/authorization` + CASL):

- Use `@nestjs/authorization` with `@Can()` decorator on every endpoint and MCP tool; deny-by-default.
- Use CASL (`@casl/ability`) as the permission engine; build abilities per user from database-stored permissions.
- Organize permissions by CATEGORY (one per domain: 'Usuarios', 'Pedidos') with individually restrictable ACTIONS.
- Use `category:action` format (e.g., `usuarios:listar`, `pedidos:aprobar`); code checks permissions, NEVER role names.
- Each domain module declares a permission manifest in `<domain>.permissions.ts` with category, actions, descriptions.
- Run `pnpm permissions:sync` on deploy/seed to upsert manifests; removed permissions are flagged, not deleted.
- CI test MUST fail if: `@Can()` references undeclared permission, OR manifest action is unused.
- Apply record-level conditions (tenant, owner, status) via `@casl/prisma` `accessibleBy()` in all list queries.
- Apply field-level permissions to response serialization and update DTO filtering; never return or accept restricted fields.
- Store permissions in PostgreSQL: `PermissionCategory`, `Permission` (with category ref, action code, description, conditions JSON, fields JSON), `RolePermission`, `UserRole`, optional `UserPermission`.
- Central `AuthzModule` aggregates manifests from all domain modules; admin UI groups permissions by category.
- Audit all permission changes (role assignments, grants, revokes) with timestamp and actor.
- Test both allowed and denied authorization cases for every endpoint and MCP tool.

Validation and Data Access:

- Use Zod v4.2+ with `nestjs-zod` for DTOs and global `ZodValidationPipe`; do NOT use class-validator.
- Use Prisma Client exclusively; never use `$queryRawUnsafe()` with interpolation.
- Use `select` or `omit` in Prisma queries to avoid exposing sensitive fields.
- Apply `prisma migrate deploy` for shared environments; never use `db push` outside local development.
- Hash passwords with Argon2id; never store plaintext credentials.
- Apply `@nestjs/throttler` on login, password reset, and sensitive endpoints.
- Enable Helmet; configure CORS with explicit origin allowlist—never `origin: '*'` with credentials.
- Validate uploads server-side with MIME allowlist and size limits.
- Use a global exception filter hiding stack traces in production.

Required guidelines (Frontend — `apps/web`):

- Never store secrets or auth tokens accessible to JavaScript; rely on HttpOnly cookies.
- Include CSRF token in all mutating requests (POST, PUT, PATCH, DELETE).
- Never use `dangerouslySetInnerHTML` without DOMPurify sanitization.
- Generate typed API clients from OpenAPI; do not hardcode endpoints.
- Use Content Security Policy headers to mitigate XSS.
- Use `@casl/react` with rules served from `/me` endpoint for UI visibility only; the API ALWAYS enforces authorization.

Plan should validate:

- monorepo structure with `apps/api` and `apps/web` is confirmed;
- authentication uses HttpOnly cookies with CSRF protection, not localStorage;
- global `AuthGuard` is registered with `@Public()` route exceptions;
- CORS allowlist matches frontend deployment URLs;
- every endpoint and MCP tool declares required `category:action` permission via `@Can()`;
- every new/changed module has permission manifest in `<domain>.permissions.ts`;
- all `@Can()` permissions are declared in manifests; all manifest actions are used (CI test);
- `pnpm permissions:sync` is part of deploy/seed process;
- record-level conditions and field-level restrictions are documented for applicable endpoints;
- list queries use `accessibleBy()` for record filtering by user permissions;
- response serialization and update DTOs apply field-level permissions;
- permission schema (`PermissionCategory`, `Permission`, `RolePermission`, `UserRole`) exists in Prisma;
- audit logging is implemented for all permission changes;
- tests cover both allowed and denied authorization cases;
- endpoints are mapped to guards, DTOs, and response types with `select`/`omit`;
- Prisma migrations are required for schema changes;
- OpenAPI client generation and synchronization process is documented;
- frontend includes CSRF tokens in mutating requests;
- frontend uses `@casl/react` for UI visibility only, with API enforcement documented.
