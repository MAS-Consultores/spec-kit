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
