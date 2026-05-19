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
| `laravel-inertia-react` | Laravel + Inertia + React | Modern portal or admin product delivery |

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
