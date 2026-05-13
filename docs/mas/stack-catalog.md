# MAS Stack Catalog

This catalog is the Phase 1 source of truth for approved MAS stacks. Stack IDs
are canonical and must be accepted exactly as written by future `--stack`
validation.

## Catalog

| Stack ID | Display Name | Primary Use |
| --- | --- | --- |
| `cakephp2-mysql` | CakePHP 2.x + MySQL | Legacy CakePHP platform evolution |
| `moodle5-plugin` | Moodle 5 -- Plugin | Moodle plugin extension work |
| `moodle5-portal` | Moodle 5 -- Portal | Moodle portal integration and customization |
| `laravel-inertia-react` | Laravel + Inertia + React | Modern portal or admin product delivery |

## `cakephp2-mysql`

### Summary

Legacy web application stack for maintaining and extending existing CakePHP 2.x
applications backed by MySQL.

### When To Use

- Enhancing an existing CakePHP 2.x platform.
- Adding administrative or coordinator workflows to a legacy system.
- Improving reporting, exports, or course/classroom management features in an
  existing CakePHP codebase.
- Making constrained changes where framework migration is not in scope.

### When Not To Use

- New greenfield portals or products.
- Work that requires a modern SPA architecture.
- Features whose main objective is Moodle plugin behavior.
- Projects where upgrading away from CakePHP 2.x is already approved as the
  primary scope.

### Core Constraints

- Preserve compatibility with the existing CakePHP 2.x conventions, routing,
  model layer, helpers, components, and authentication mechanisms.
- Treat MySQL schema changes as controlled migrations with rollback planning.
- Avoid introducing framework patterns that do not fit CakePHP 2.x.
- Keep changes localized when modifying legacy flows.
- Require explicit data model and query impact analysis for reporting/export
  features.

### Typical Risks

- Regression in legacy controller/model behavior.
- SQL injection or unsafe query construction in older data access patterns.
- Permission drift in custom administrative workflows.
- Performance regressions from report queries, joins, or exports.
- Inconsistent validation between legacy forms and model rules.

### Expected Artifacts

- Impact analysis for touched controllers, models, views, helpers, components,
  and routes.
- Data model or schema migration notes.
- Query and export performance assumptions.
- Regression test plan focused on legacy flows.
- Rollback notes for schema and behavior changes.

### Stack-Specific Security Guidelines

- Validate all request data through CakePHP 2.x-compatible validation paths.
- Use parameterized queries or framework query builders; raw SQL requires an
  explicit justification.
- Preserve existing authentication/session behavior unless the plan explicitly
  changes it.
- Check authorization for each administrative action, report, and export.
- Treat legacy file uploads and generated exports as high-risk surfaces.

### `speckit-plan` Validation

- Confirms the plan identifies CakePHP 2.x and MySQL as fixed constraints.
- Rejects unapproved framework migration or new framework introduction.
- Checks that touched legacy modules and regression coverage are named.
- Requires schema and rollback notes for database changes.
- Requires query/export performance review for reporting-heavy work.

## `moodle5-plugin`

### Summary

Moodle 5 plugin development stack for extending Moodle through approved plugin
types while respecting Moodle APIs, capabilities, privacy contracts, and upgrade
paths.

### When To Use

- Building or modifying a Moodle plugin.
- Adding course, classroom, activity, block, local, report, or admin behavior
  inside Moodle.
- Integrating learning workflows through Moodle's plugin APIs.
- Implementing Moodle-specific reporting or coordinator tooling as a plugin.

### When Not To Use

- Building a standalone portal outside Moodle.
- Implementing a general Laravel admin product.
- Directly modifying Moodle core.
- Adding behavior that should live in an external integration layer.

### Core Constraints

- Use Moodle 5 APIs and plugin structure for the selected plugin type.
- Do not modify Moodle core files.
- Define required capabilities, roles, events, tasks, and privacy behavior.
- Respect Moodle upgrade, install, and backup/restore expectations.
- Use Moodle data APIs and coding conventions.

### Typical Risks

- Capability gaps that expose academic or personal data.
- Plugin behavior that breaks during Moodle upgrades.
- Direct SQL or direct table access where Moodle APIs are required.
- Incomplete privacy provider coverage.
- Background task or event behavior that creates operational load.

### Expected Artifacts

- Plugin type and directory layout.
- Capability matrix and role mapping.
- Database install/upgrade notes if tables change.
- Event, observer, scheduled task, or web service contract notes.
- Privacy provider and data exposure notes.
- Moodle test plan for supported roles.

### Stack-Specific Security Guidelines

- Use Moodle capability checks at every entry point.
- Minimize access to user, grade, enrollment, and course participation data.
- Define privacy provider behavior for personal data.
- Avoid direct output of hidden course or user data.
- Protect AJAX, web service, and scheduled task entry points with Moodle
  authentication and capability checks.

### `speckit-plan` Validation

- Confirms the plan names the plugin type and Moodle 5 APIs involved.
- Rejects Moodle core modification unless explicitly approved as a deviation.
- Requires capability, role, and privacy coverage.
- Requires install/upgrade path for database changes.
- Checks that tests cover relevant Moodle roles and contexts.

## `moodle5-portal`

### Summary

Moodle 5 portal integration stack for portals that integrate with Moodle while
presenting custom user, coordinator, reporting, or administrative experiences.

### When To Use

- Building a portal that depends on Moodle data or Moodle authentication.
- Creating custom learner, coordinator, or administrative flows adjacent to
  Moodle.
- Implementing integrations that aggregate Moodle data with company-specific
  business processes.
- Building reporting/export workflows around Moodle-origin data.

### When Not To Use

- Developing code that must be packaged as a Moodle plugin.
- Maintaining a legacy CakePHP 2.x platform.
- Building a portal with no Moodle dependency.
- Making direct, unsupported changes inside Moodle core.

### Core Constraints

- Treat Moodle as an external system with explicit integration boundaries.
- Define authentication, SSO, session, and user identity mapping.
- Define data synchronization, ownership, freshness, and failure behavior.
- Avoid direct Moodle database coupling unless explicitly approved.
- Preserve visibility rules for courses, cohorts, roles, grades, and users.

### Typical Risks

- Mismatched Moodle permissions and portal permissions.
- Overexposure of academic data through custom reports or dashboards.
- Fragile integration with Moodle internals.
- Stale or inconsistent synchronized data.
- Operational failures around SSO, background sync, or export jobs.

### Expected Artifacts

- Integration boundary diagram or textual boundary description.
- Auth/SSO and identity mapping notes.
- Data flow and synchronization model.
- Permission and visibility matrix.
- Failure mode and retry behavior for Moodle integration.
- Report/export data handling notes.

### Stack-Specific Security Guidelines

- Mirror Moodle visibility constraints in the portal authorization model.
- Protect SSO/session handoff and identity mapping from confused-deputy issues.
- Limit report/export scope by role, course, cohort, and business context.
- Avoid storing sensitive Moodle-origin data unless retention is justified.
- Audit cross-system actions that affect learners, courses, grades, or
  enrollment-related records.

### `speckit-plan` Validation

- Confirms Moodle integration boundaries are explicit.
- Requires auth/SSO, identity, and permission mapping.
- Flags direct Moodle database access as a deviation.
- Requires synchronization and failure-mode design when data is copied.
- Requires report/export controls for Moodle-origin data.

## `laravel-inertia-react`

### Summary

Modern Laravel application stack with Inertia and React for portals,
administrative products, reporting systems, and operational workflows.

### When To Use

- Building a new MAS portal or administrative product.
- Creating modern coordinator or back-office workflows.
- Implementing reporting/export-heavy systems with controlled access.
- Building Laravel products that need React-driven user interactions without a
  separate API SPA architecture.

### When Not To Use

- Maintaining an existing CakePHP 2.x platform.
- Writing a Moodle plugin.
- Building a portal whose architecture is dictated by another existing stack.
- Creating a public API-first product where Inertia is not appropriate.

### Core Constraints

- Use Laravel as the application boundary and Inertia as the server-driven
  frontend bridge.
- Keep authorization in Laravel policies, gates, middleware, or form requests.
- Use explicit request validation and data transfer boundaries.
- Treat reports and exports as controlled, auditable operations.
- Keep React components aligned with Inertia page contracts.

### Typical Risks

- Authorization drift between frontend state and backend policy checks.
- Overfetching sensitive data into Inertia props.
- Missing validation for filters, exports, uploads, and administrative actions.
- Session, SSO, or CSRF mistakes in portal flows.
- Slow report queries or unbounded exports.

### Expected Artifacts

- Route, controller, request, policy, and Inertia page map.
- Data model and migration notes.
- Authorization matrix for roles and administrative actions.
- Inertia prop contract for sensitive pages.
- Export/report performance and access-control notes.
- Test plan covering policies, requests, feature flows, and key React states.

### Stack-Specific Security Guidelines

- Enforce authorization on the server for every route and action.
- Validate all request payloads with form requests or equivalent validators.
- Never rely on hidden React UI state for access control.
- Minimize sensitive data sent through Inertia props.
- Protect sessions, CSRF, SSO callbacks, file uploads, and exports.

### `speckit-plan` Validation

- Confirms Laravel, Inertia, and React are the selected stack boundaries.
- Requires route/controller/request/policy/page artifact coverage.
- Checks server-side authorization and validation coverage.
- Requires Inertia prop review for sensitive data.
- Requires bounded report/export behavior and tests.
