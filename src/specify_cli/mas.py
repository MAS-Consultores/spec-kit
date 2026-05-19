"""MAS stack metadata for internal stack-aware initialization."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


MAS_CORE_PRESET_ID = "mas-core"
MAS_CORE_PRESET_PRIORITY = 10
MAS_STACK_PRESET_PRIORITY = 5


@dataclass(frozen=True)
class MasStack:
    """Canonical MAS stack metadata."""

    id: str
    display_name: str
    summary: str
    purpose: str
    when_to_use: tuple[str, ...]
    when_not_to_use: tuple[str, ...]
    fixed_boundaries: tuple[str, ...]
    security_profile: str
    security_controls: tuple[str, ...]
    sensitive_data_surfaces: tuple[str, ...]
    security_pitfalls: tuple[str, ...]
    security_evidence: tuple[str, ...]
    core_constraints: tuple[str, ...]
    typical_risks: tuple[str, ...]
    anti_patterns: tuple[str, ...]
    expected_artifacts: tuple[str, ...]
    preferred_practices: tuple[str, ...]
    plan_validation_checks: tuple[str, ...]
    likely_project_shape: tuple[str, ...]

    @property
    def stack_preset_id(self) -> str:
        return f"mas-stack-{self.id}"

    @property
    def preset_composition(self) -> tuple[str, str]:
        return (MAS_CORE_PRESET_ID, self.stack_preset_id)

    @property
    def preset_install_plan(self) -> tuple[tuple[str, int], tuple[str, int]]:
        """Return bundled preset IDs and priorities for stack-aware init."""
        return (
            (MAS_CORE_PRESET_ID, MAS_CORE_PRESET_PRIORITY),
            (self.stack_preset_id, MAS_STACK_PRESET_PRIORITY),
        )

    def init_options_payload(self) -> dict[str, object]:
        """Return the machine-readable init-options payload for this stack."""
        return {
            "stack": self.id,
            "stack_display_name": self.display_name,
            "mas_presets": list(self.preset_composition),
        }

    def render_stack_md(self) -> str:
        return "\n".join([
            "# Selected MAS Stack",
            "",
            f"**Canonical ID**: `{self.id}`",
            f"**Display Name**: {self.display_name}",
            f"**Selected During**: `specify init --stack {self.id}`",
            "",
            "## Summary",
            "",
            self.summary,
            "",
            "## Purpose",
            "",
            self.purpose,
            "",
            "## Fixed Stack Boundaries",
            "",
            _bullets(self.fixed_boundaries),
            "",
            "## Use This Stack For",
            "",
            _bullets(self.when_to_use),
            "",
            "## Do Not Use This Stack For",
            "",
            _bullets(self.when_not_to_use),
            "",
            "## Plan Validation",
            "",
            "`speckit-plan` MUST validate proposed implementation plans against "
            "this stack. It MUST NOT ask the user to choose a replacement stack "
            "during planning.",
            "",
        ])

    def render_security_guidelines_md(self) -> str:
        return "\n".join([
            "# Stack Security Guidelines",
            "",
            f"**Stack ID**: `{self.id}`",
            f"**Display Name**: {self.display_name}",
            "",
            "## Security Profile",
            "",
            self.security_profile,
            "",
            "## Security Controls",
            "",
            _bullets(self.security_controls),
            "",
            "## Sensitive Data Surfaces",
            "",
            _bullets(self.sensitive_data_surfaces),
            "",
            "## Security Pitfalls",
            "",
            _bullets(self.security_pitfalls),
            "",
            "## Security Evidence",
            "",
            _bullets(self.security_evidence),
            "",
            "## Plan Validation Use",
            "",
            "Plans must cite how each security control is satisfied, how security "
            "evidence is produced, mark items not applicable with a reason, or "
            "document an explicit approved deviation.",
            "",
        ])

    def render_stack_context_md(self) -> str:
        return "\n".join([
            f"# Stack Context: {self.display_name}",
            "",
            "## Core Constraints",
            "",
            _bullets(self.core_constraints),
            "",
            "## Typical Risks",
            "",
            _bullets(self.typical_risks),
            "",
            "## Anti-Patterns",
            "",
            _bullets(self.anti_patterns),
            "",
            "## Expected Artifacts",
            "",
            _bullets(self.expected_artifacts),
            "",
            "## Preferred Practices",
            "",
            _bullets(self.preferred_practices),
            "",
            "## Plan Validation Checks",
            "",
            _bullets(self.plan_validation_checks),
            "",
            "## Likely Project Shape",
            "",
            _bullets(self.likely_project_shape),
            "",
        ])


def _bullets(items: tuple[str, ...]) -> str:
    return "\n".join(f"- {item}" for item in items)


MAS_STACKS: dict[str, MasStack] = {
    "cakephp2-mysql": MasStack(
        id="cakephp2-mysql",
        display_name="CakePHP 2.x + MySQL",
        summary="Legacy CakePHP 2.x platform evolution backed by MySQL.",
        purpose=(
            "Legacy internal and admin-heavy web applications that must stay "
            "compatible with the existing CakePHP 2.x estate and MySQL-backed "
            "operational data."
        ),
        when_to_use=(
            "The feature extends an existing CakePHP 2.x codebase, module, or back-office workflow instead of creating a new platform.",
            "The work is centered on server-rendered CRUD, reporting, operational listings, approvals, exports, or compatibility-sensitive maintenance.",
            "The business value depends on preserving the current authentication, deployment, hosting, and schema model instead of introducing a new application shell.",
        ),
        when_not_to_use=(
            "Greenfield product surfaces that need a modern component-driven frontend or a new application platform.",
            "Work that would require a de facto framework migration, SPA architecture, or a separate runtime to stay maintainable.",
            "Heavy asynchronous integration or event-driven designs that would fight the legacy request lifecycle and operational environment.",
        ),
        fixed_boundaries=(
            "CakePHP 2.x remains the application framework boundary.",
            "MySQL remains the persistence layer unless a deviation is approved.",
            "Legacy routing, controller, model, helper, component, and authentication conventions must be preserved.",
        ),
        security_profile=(
            "Legacy CakePHP 2.x systems often contain older request handling, "
            "authorization, query, and export patterns. Changes must improve "
            "safety without breaking legacy compatibility."
        ),
        security_controls=(
            "Enable `SecurityComponent` with form tampering and CSRF protection on every controller that accepts mutations.",
            "Authorize privileged actions with `AuthComponent` server-side; never rely on view-only checks.",
            "Hash credentials with `Security::hash($pwd, 'blowfish')` or migrate to `password_hash` / `password_verify` in a dedicated layer; never use md5/sha1 for passwords.",
            "Keep `Security.salt` and `Security.cipherSeed` out of version-controlled `app/Config/core.php`; rotate them after credential incidents.",
            "Use ORM bindings or `$Model->find` parameter arrays; ban string-concatenated `$this->Model->query(...)` for user-controlled input.",
            "Validate and sanitize `$this->request->data` server-side; never echo request data without contextual escaping helpers.",
            "Use the `h()` helper every time user-influenced or stored dynamic text is output in views, elements, layouts, and emails (including inside HTML attributes and JSON-in-script); treat omission of `h()` as a defect unless the value is provably constant and non-HTML.",
            "For every file upload, validate the real MIME type and magic bytes (for example `finfo_file` / `mime_content_type` on a temp path) against an allow-list; never trust the browser `Content-Type` or the original filename alone. Reject `.php`, `.phtml`, `.phar`, `.htaccess`, path traversal in names, and double extensions that smuggle executables.",
            "Store uploads outside the webroot or behind non-executable delivery (no direct PHP execution from the upload directory); normalize stored filenames.",
            "Apply security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy) at the web server or reverse proxy; CakePHP 2 has no robust native equivalent.",
            "Maintain a manual CVE and patch inventory because CakePHP 2.x is out of official maintenance; track third-party plugin compatibility per release.",
        ),
        sensitive_data_surfaces=(
            "Legacy user, course, classroom, coordinator, and administrative records.",
            "Report and export outputs generated from MySQL queries.",
            "Uploaded files, temporary generated files, and session-linked records.",
        ),
        security_pitfalls=(
            "Disabling `SecurityComponent` because forms break instead of fixing FormHelper usage.",
            "Calling `$this->Model->query('SELECT ... WHERE id = ' . $id)` with user-controlled input.",
            "Storing `Security.salt` / `cipherSeed` in committed configuration files.",
            "Authorizing only in views or hidden fields instead of `AuthComponent` / `isAuthorized`.",
            "Printing dynamic values with `echo` / short tags without `h()`, or embedding them unescaped in attributes, `<script>`, or JavaScript literals (XSS).",
            "Accepting uploads based only on client `Content-Type` or file extension without server-side MIME and content checks, or allowing `.php` / scriptable types into a web-served folder.",
            "Logging request bodies, sessions, or stack traces that contain credentials or PII.",
            "Letting legacy plugins or vendor trees drift from a known-good patched baseline.",
        ),
        security_evidence=(
            "Plan documents controllers where `SecurityComponent` or `AuthComponent` configuration changes.",
            "Plan lists views or elements that render user-influenced text and confirms `h()` (or equivalent) is applied at every output site.",
            "Plan describes upload handling: MIME and extension allow-list, denial of `.php` and related types, storage path, and how files are served without execution risk.",
            "Plan lists models and queries touched and confirms parameterized access (no raw SQL with user input).",
            "Plan attaches the CVE/patch inventory delta when third-party or core code changes.",
            "QA covers authentication, authorization, CSRF, and pagination for affected operational paths.",
            "Deployment notes include web-server header configuration when applicable.",
        ),
        core_constraints=(
            "Preserve CakePHP 2.x conventions, controller/model/view boundaries, legacy bootstrap behavior, and established auth or ACL patterns.",
            "Favor conservative MySQL migrations, explicit rollback planning, and schema changes that are safe for live operational data.",
            "Assume legacy compatibility and hosting constraints are real unless the plan records an approved exception.",
        ),
        typical_risks=(
            "Tight coupling in reused models, helpers, or components causing regressions far from the feature entry point.",
            "Slow queries, pagination regressions, or export/report timeouts on large operational datasets.",
            "Hidden manual SQL, ad hoc production data fixes, or fragile migrations that bypass traceable delivery controls.",
        ),
        anti_patterns=(
            "Do not smuggle in a parallel frontend architecture or framework migration under a normal feature request.",
            "Do not bypass migrations, data-model documentation, or delivery traceability with direct database changes.",
            "Do not ship large-listing or admin workflow changes without validating performance, pagination, and rollback behavior.",
        ),
        expected_artifacts=(
            "Controller, model, view, component, helper, shell, or config changes that stay aligned with the CakePHP 2.x structure already in use.",
            "Documented MySQL schema or migration impact, validation rules, indexes, seed or backfill needs, and rollback notes.",
            "QA coverage for permissions, admin flows, listings, filters, exports, and other operational paths touched by the feature.",
        ),
        preferred_practices=(
            "Reuse established CakePHP components, helpers, and query patterns before introducing new abstractions.",
            "Keep data-model, pagination, indexing, and report/export impacts explicit in the plan and tasks.",
            "Make risky legacy touchpoints visible early so QA, deployment, and rollback planning are not afterthoughts.",
        ),
        plan_validation_checks=(
            "Confirm CakePHP 2.x and MySQL are fixed constraints.",
            "Reject unapproved framework migration or new framework introduction.",
            "Require schema and rollback notes for database changes.",
            "Require query/export performance review for reporting-heavy work.",
        ),
        likely_project_shape=(
            "CakePHP app controllers, models, views, helpers, components, and config/routes.",
            "MySQL schema migrations or SQL scripts when persistence changes are needed.",
            "Legacy regression tests or documented manual regression paths.",
        ),
    ),
    "moodle5-plugin": MasStack(
        id="moodle5-plugin",
        display_name="Moodle 5 Plugin",
        summary="Moodle plugin extension work inside Moodle 5.",
        purpose=(
            "Bounded Moodle 5 extensions delivered as plugins that fit Moodle's "
            "plugin APIs, lifecycle, permissions, privacy model, and Bootstrap 5-based "
            "UI reality."
        ),
        when_to_use=(
            "The feature is a discrete Moodle capability that can live inside a standard plugin boundary with clear ownership.",
            "The work fits Moodle plugin APIs, capabilities, forms, events, privacy APIs, scheduled tasks, and upgrade steps.",
            "UI work can stay inside Moodle's rendering model, Mustache or renderer patterns, and the Bootstrap 5 conventions already present in Moodle 5.",
        ),
        when_not_to_use=(
            "Requests that really require a broader portal or cross-area institutional workflow rather than a bounded plugin.",
            "Features that only work by patching Moodle core, replacing shared portal navigation, or ignoring Moodle's upgrade lifecycle.",
            "Frontend-heavy experiences that assume a custom standalone application shell instead of Moodle's plugin and Bootstrap 5 environment.",
        ),
        fixed_boundaries=(
            "Moodle 5 plugin APIs and plugin structure define the implementation boundary.",
            "Moodle core files must not be modified.",
            "Capabilities, roles, contexts, privacy, install, and upgrade behavior must be explicit.",
        ),
        security_profile=(
            "Moodle plugins operate inside Moodle's permission, context, privacy, "
            "event, and upgrade model. Security failures can expose academic, "
            "personal, grade, enrollment, or course participation data."
        ),
        security_controls=(
            "Call `require_login()` and `require_capability()` with the correct context on every plugin entrypoint (pages, AJAX, web services, scheduled tasks).",
            "Protect state-changing flows with `sesskey()` / `confirm_sesskey()` or Moodle Forms (`moodleform`), which handle sesskey automatically.",
            "Use the `$DB` API with named placeholders only; never concatenate user-controlled input into SQL strings.",
            "Render output with `format_string` / `format_text` using the proper context and filters; never echo raw user input.",
            "Serve uploads via the Files API and `pluginfile.php` with capability checks; never expose raw filesystem paths.",
            "For every upload surface (draft areas, file managers, custom forms), enforce allowed extensions and MIME type groups server-side (`file_extension`, `file_mimetype_in_typegroup`, or equivalent); reject `.php`, `.phtml`, `.phar`, `.htaccess`, path tricks, and double extensions. Never persist user binaries to a web-served directory outside Moodle's file storage model.",
            "Implement the Privacy API (provider, metadata, export, delete) for any plugin that stores or derives personal data.",
            "Use language strings (`get_string`) for user-visible text; keep credentials and identifiers out of debug output.",
            "Track Moodle compatibility via `version.php` and ship `db/upgrade.php` paths that preserve capabilities and privacy metadata across upgrades.",
        ),
        sensitive_data_surfaces=(
            "User, grade, enrollment, course, cohort, and participation data.",
            "Plugin tables and Moodle file areas.",
            "AJAX endpoints, external services, scheduled tasks, events, and exports.",
        ),
        security_pitfalls=(
            "Skipping `require_login` on AJAX endpoints because they are internal.",
            "Calling `$DB->execute` or `$DB->get_records_sql` with concatenated user input.",
            "Using `optional_param` / `required_param` with the wrong type (e.g. PARAM_RAW) where PARAM_INT, PARAM_ALPHANUM, or PARAM_TEXT is required.",
            "Bypassing the Files API by writing directly to `$CFG->dataroot` or returning filesystem paths in URLs.",
            "Accepting uploads without server-side MIME and extension checks, or allowing scriptable types (for example `.php`) to be stored or served in a way that could execute under the web server.",
            "Omitting privacy metadata for new tables, leaving the plugin non-compliant with the Privacy API.",
            "Sharing state with globals across requests instead of session and context APIs.",
        ),
        security_evidence=(
            "Plan lists each entrypoint, the capability checked, and the context level used.",
            "Plan records `version.php`, `db/install.xml` / `db/upgrade.php`, and privacy metadata changes.",
            "Plan lists new or changed language strings.",
            "QA covers teacher, student, admin, and guest flows, including capability denial paths.",
            "Plan documents how uploads are stored and served through the Files API, including MIME or typegroup rules, extension deny-list, and capability checks on `pluginfile`.",
        ),
        core_constraints=(
            "Stay inside Moodle 5 plugin APIs, capability checks, events, privacy handling, versioning, and upgrade-step conventions.",
            "Assume Moodle ecosystem compatibility matters: plugin changes must coexist with the host instance, theme, and upgrade path.",
            "Treat Bootstrap 5, Moodle form APIs, language strings, and renderer or template conventions as the frontend baseline rather than inventing a separate UI system.",
        ),
        typical_risks=(
            "Capability, privacy, or data-exposure regressions that leak course, user, grading, or institutional information.",
            "Broken installs or upgrades due to missing `version.php`, `db/install.xml`, `db/upgrade.php`, or incomplete capability and privacy changes.",
            "Maintenance drag from bypassing Moodle APIs or building frontend behavior that fights Moodle's rendering and theming model.",
        ),
        anti_patterns=(
            "Do not patch Moodle core when a plugin extension point is the correct solution.",
            "Do not skip capability, privacy, versioning, install, or upgrade analysis for seemingly small features.",
            "Do not introduce a separate frontend stack that ignores Moodle's Bootstrap 5 and plugin rendering constraints unless an exception is approved.",
        ),
        expected_artifacts=(
            "Plugin files such as `version.php`, `db/install.xml`, `db/upgrade.php`, language strings, capabilities, privacy metadata, classes, forms, templates, or renderers as applicable.",
            "Explicit install, upgrade, rollback, and permissions notes for the plugin and any stored or derived data it introduces.",
            "QA coverage for teacher, student, admin, and manager workflows touched by the plugin, including Bootstrap 5 UI states where relevant.",
        ),
        preferred_practices=(
            "Use Moodle forms, capability checks, string management, privacy APIs, and plugin upgrade paths consistently.",
            "Keep plugin data bounded and document any new tables, scheduled tasks, events, or privacy exports explicitly.",
            "Design UI additions to feel native to Moodle 5, including Bootstrap 5-based layout and predictable admin workflows.",
        ),
        plan_validation_checks=(
            "Confirm plugin type and Moodle 5 APIs involved.",
            "Reject Moodle core modification unless approved as a deviation.",
            "Require capability, role, context, and privacy coverage.",
            "Require install/upgrade path for database changes.",
        ),
        likely_project_shape=(
            "Moodle plugin directory for the selected plugin type.",
            "db/access.php, db/install.xml, db/upgrade.php, classes/, lang/, templates/, and tests as applicable.",
            "Role and context test coverage for protected behavior.",
        ),
    ),
    "moodle5-portal": MasStack(
        id="moodle5-portal",
        display_name="Moodle 5 Portal",
        summary="Institution-facing Moodle 5 portal and cross-area operational workflows.",
        purpose=(
            "Institution-facing Moodle 5 portal work that spans multiple workflows, "
            "operational teams, reports, and user roles while still living inside "
            "Moodle's ecosystem and Bootstrap 5 UI constraints."
        ),
        when_to_use=(
            "The feature crosses portal navigation, reporting, enrollment, certification, institution-facing operations, or multiple Moodle touchpoints.",
            "Operational users need coordinated workflows, dashboards, filters, reports, exports, or support tooling that go beyond a small isolated plugin.",
            "The solution can remain aligned with Moodle 5 services, Bootstrap 5 UI conventions, shared permissions, and portal-wide governance.",
        ),
        when_not_to_use=(
            "Small self-contained functionality that should remain a bounded Moodle plugin instead of portal work.",
            "Greenfield product requests that would be better served by the Laravel + Inertia + React stack rather than portal customizations.",
            "Features that need to ignore shared portal permissions, reporting standards, or Moodle ecosystem constraints to be viable.",
        ),
        fixed_boundaries=(
            "Portal behavior must fit existing Moodle 5 capabilities, service boundaries, navigation patterns, and Bootstrap 5-based operational UI expectations.",
            "Reporting, pagination, exports, cohort or enrollment flows, and institutional data sensitivity are first-class design constraints.",
            "Moodle core must not be modified; portal changes must use approved extension points and shared portal conventions.",
            "Multi-role operational ownership requires traceability, supportability, and rollout safety alongside feature delivery.",
        ),
        security_profile=(
            "Moodle 5 portal work spans multiple operational workflows inside Moodle's "
            "permission, context, and institutional data model. Security failures can "
            "leak cross-institution data, expose grades or enrollments, or break "
            "auditability for bulk administrative actions."
        ),
        security_controls=(
            "Apply institution-aware capability checks on every cross-area page; never assume a global admin context.",
            "Paginate large listings, reports, and exports server-side with explicit per-context permission checks before each batch.",
            "Emit audit events for cohort or enrollment changes, role assignments, and bulk actions through Moodle's event API.",
            "Enforce cohort or tenant isolation: reports, exports, and notifications must scope to the active institution context.",
            "Protect report and export downloads through `pluginfile.php` with capability-aware callbacks.",
            "Coordinate LDAP, SAML, or SSO with central identity ownership; do not bypass Moodle auth plugins for shortcuts.",
            "For portal file intake (imports, attachments, archives, generated exports that re-ingest user files), validate real MIME types and enforce extension allow-lists server-side; reject `.php`, `.phtml`, `.phar`, nested archives with executables, and path-traversal names. Keep persisted user files in Moodle file storage with `pluginfile` delivery, not ad-hoc web directories.",
        ),
        sensitive_data_surfaces=(
            "Institution-scoped user, cohort, enrollment, grade, and course data.",
            "Portal dashboards, operational listings, reports, and exports.",
            "Bulk actions, role assignments, and cohort or enrollment mutations.",
            "AJAX endpoints, scheduled jobs, and file imports tied to portal workflows.",
        ),
        security_pitfalls=(
            "Querying institutional data without filtering by the active context (course, cohort, category).",
            "Building dashboards that mix institutions without explicit tenant scoping.",
            "Shipping bulk actions without confirmation, audit events, or partial-failure handling.",
            "Returning unbounded result sets in admin reports, enabling slow rendering or timeout-based abuse.",
            "Hardcoding institution-specific roles instead of capabilities and contexts.",
            "Bulk-importing or re-hosting user-supplied files without MIME and extension validation, allowing executable content into institutional workflows or web-served paths.",
        ),
        security_evidence=(
            "Plan lists operational roles touched and the capability and context combination each requires.",
            "Plan documents pagination, filtering, and export limits for every large listing or report.",
            "Plan registers audit events for sensitive operations (cohort, enrollment, role assignment, bulk).",
            "QA validates institution isolation: users in institution A must not see institution B data.",
            "Plan describes any portal upload or import path: MIME and extension policy, explicit rejection of `.php` and related types, and how files are stored and delivered without execution risk.",
        ),
        core_constraints=(
            "Portal behavior must fit existing Moodle 5 capabilities, service boundaries, navigation patterns, and Bootstrap 5-based operational UI expectations.",
            "Treat reporting, pagination, exports, cohort or enrollment flows, and institutional data sensitivity as first-class design constraints.",
            "Assume multi-role operational ownership: supportability, traceability, and rollout safety matter as much as the feature itself.",
        ),
        typical_risks=(
            "Cross-area permission leakage, role confusion, or inconsistent workflow behavior between portal surfaces.",
            "Performance and operability failures in large listings, reports, exports, enrollments, or synchronization-heavy flows.",
            "Portal drift caused by ad hoc solutions that bypass shared portal conventions, observability needs, or institutional support requirements.",
        ),
        anti_patterns=(
            "Do not treat institution-wide portal changes as if they were isolated plugin tweaks.",
            "Do not bypass shared portal auth, navigation, reporting, or observability standards for local convenience.",
            "Do not ship operationally sensitive portal changes without controlled deployment and rollback planning.",
        ),
        expected_artifacts=(
            "Portal page, renderer, template, integration, permission, and reporting changes mapped clearly to the affected operational flows.",
            "Documented pagination, filtering, export, audit, rollout, and rollback expectations for institution-facing screens and jobs.",
            "QA and production validation steps that cover real administrative users, support teams, and shared portal operations.",
        ),
        preferred_practices=(
            "Use Moodle-native capabilities and services while keeping portal workflows explicit, observable, and supportable.",
            "Design for backend pagination, predictable filters, reusable Bootstrap 5 admin patterns, and safe exports or batch actions.",
            "Document which roles, institutions, reports, and support teams are affected so delivery planning reflects operational reality.",
        ),
        plan_validation_checks=(
            "Confirm portal workflows map to Moodle capabilities and context levels.",
            "Require pagination and export limits for large institutional listings.",
            "Require audit events for cohort, enrollment, role, and bulk operations.",
            "Validate institution isolation in QA.",
            "Reject unbounded reports or dashboards without explicit scoping.",
        ),
        likely_project_shape=(
            "Moodle portal pages, renderers, Mustache templates, and local or report plugins as applicable.",
            "Capability definitions, event observers, and scheduled tasks for operational flows.",
            "Tests for institution isolation, role denial paths, and Bootstrap 5 UI states.",
        ),
    ),
    "laravel-inertia-react": MasStack(
        id="laravel-inertia-react",
        display_name="Laravel + Inertia + React",
        summary="Modern Laravel/Inertia/React portal or admin product delivery.",
        purpose=(
            "The company's standard modern web application stack for business systems "
            "that use Laravel on the backend and Inertia with React on the frontend."
        ),
        when_to_use=(
            "The feature belongs in a modern Laravel application with server-owned routing, validation, authorization, and data access.",
            "The UI benefits from React components and Inertia pages while still fitting a server-driven application model instead of a disconnected SPA.",
            "The work can follow the company conventions around React + TypeScript starterkit usage, Tailwind, shadcn/ui, backend pagination, reusable form components, and traceable Laravel delivery practices.",
        ),
        when_not_to_use=(
            "Moodle plugin or portal requests that need to live inside Moodle's ecosystem and Bootstrap 5 reality.",
            "Legacy CakePHP 2.x enhancements where compatibility matters more than adopting the modern stack.",
            "Features that only make sense as a standalone public API platform or a custom client-only application outside the current Laravel + Inertia operating model.",
        ),
        fixed_boundaries=(
            "Laravel is the application boundary and Inertia is the server-driven frontend bridge.",
            "React components consume Inertia page contracts and must not own authorization decisions.",
            "Authorization, validation, session, SSO, reports, and exports are enforced server-side.",
        ),
        security_profile=(
            "Laravel/Inertia/React portals concentrate security at Laravel routes, "
            "middleware, validation, policies, sessions, and the server-provided "
            "Inertia prop boundary. The React UI must never be the source of "
            "authorization truth."
        ),
        security_controls=(
            "Authorize every controller action with Policies and Gates (`$this->authorize(...)` or `can:` middleware); never rely on React or Inertia alone.",
            "For mutating actions (`store`, `update`, and any other write that accepts a request body), type-hint a dedicated `FormRequest` subclass with explicit rules and authorization; do not use `Illuminate\\Http\\Request` in those methods. Read-only endpoints may use `Request` only when no validated body is consumed.",
            "Reject unvalidated array hydration from any request object into models or commands.",
            "Enforce mass-assignment rules with explicit `$fillable` (or guarded models with deliberate fillable lists) on every Eloquent model that accepts user input.",
            "Hash credentials with bcrypt or argon2id via `Hash::make`; encrypt PII with `encrypted` or `encrypted:array` casts and rotate `APP_KEY` per policy.",
            "Apply `RateLimiter` or `throttle:` middleware to authentication, password reset, and sensitive write endpoints; log throttling events.",
            "Keep CSRF middleware enabled on all state-changing routes; forward the XSRF cookie or token for Inertia as documented.",
            "Emit security headers (CSP with nonce or hashes, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) via middleware or reverse proxy; align Vite and Inertia HTML with the CSP nonce when used.",
            "Run `composer audit` and `npm audit --omit=dev` in CI; resolve high-severity advisories before release.",
            "Strip sensitive values from Inertia shared data in `HandleInertiaRequests`; expose only minimal session or user fields.",
            "For uploads, validate in Form Requests using `file`, `mimes`, `mimetypes`, and size limits; verify the real MIME type from the stored file (for example `File::mimeType()` or `finfo`) against an allow-list. Reject `.php`, `.phtml`, `.phar`, `.htaccess`, path traversal in original names, and double extensions. Store outside `public/` or serve only through authenticated download routes; never execute uploaded binaries.",
            "Disable debug surfaces in production (`APP_DEBUG=false`); protect Telescope, Horizon, and Pulse behind authorization.",
        ),
        sensitive_data_surfaces=(
            "Inertia props carrying user, role, report, export, or administrative data.",
            "Laravel sessions, SSO callbacks, CSRF-protected actions, uploads, and downloads.",
            "Report filters, generated exports, and back-office administrative actions.",
        ),
        security_pitfalls=(
            "Authorizing only in React or Inertia without a backend Policy or Gate.",
            "Using `Request $request` (or untyped request) in `store`, `update`, or other write actions instead of a dedicated `FormRequest`, which bypasses centralized validation and `authorize()` on the request class.",
            "Using `Model::create($request->all())` or `Model::fill($request->all())` without Form Request validation and `$fillable` enforcement.",
            "Rendering user HTML with `dangerouslySetInnerHTML` without server-side sanitization.",
            "Storing API tokens, signed URLs, or PII in Inertia shared props or client state that leaks in the page payload.",
            "Disabling CSRF middleware instead of wiring the token correctly.",
            "Returning raw Eloquent models in Inertia responses, exposing hidden attributes or internal flags.",
            "Running `php artisan tinker`, `migrate:fresh`, or ad hoc `DB::statement` in production without an audit trail.",
            "Trusting the browser filename or `Content-Type` alone, storing uploads under `public/` with predictable URLs, or skipping MIME checks so `.php` or disguised executables can be uploaded or executed.",
        ),
        security_evidence=(
            "Plan lists Policies, Gates, and Form Requests added or reused, with the routes they cover.",
            "Plan or PR lists each `store` / `update` (and other write) action and names the concrete `FormRequest` class used; no generic `Request` type-hint on those methods.",
            "Plan states which Eloquent models change and the fillable or guarded posture for each.",
            "Migrations and seeders document PII handling (encrypted casts, hashing, factory redaction).",
            "Pull requests include `composer audit` and `npm audit` results with remediation for high-severity issues.",
            "QA notes cover authentication boundaries, rate limiting, CSRF on Inertia forms, and CSP or headers in the target environment.",
            "Plan documents each upload endpoint: validation rules, MIME verification, extension deny-list, storage disk and path, and how downloads are authorized.",
        ),
        core_constraints=(
            "Laravel remains the source of truth for routing, validation, authorization, persistence, jobs, notifications, and business rules.",
            "Use the React + TypeScript starterkit direction, Tailwind styling, and shadcn/ui-based reusable components rather than ad hoc UI patterns.",
            "Follow company defaults such as REST-style routes and controllers, `spatie/laravel-permission` for roles or permissions, Socialite where external auth or SSO is in scope, backend-driven pagination, and disciplined migrations or seeders.",
        ),
        typical_risks=(
            "Boundary drift between controllers, requests, policies, Inertia responses, and React pages leading to duplicated or contradictory logic.",
            "Authorization, validation, pagination, or form-state problems caused by pushing too much behavior into the client layer.",
            "Inconsistent UI, brittle deployments, or broken environments when migrations, seeders, assets, permissions, or auth integrations are handled informally.",
        ),
        anti_patterns=(
            "Do not create parallel client-side data flows that bypass Laravel, Inertia, or the established permission model without an approved exception.",
            "Do not duplicate authorization or validation rules across backend and frontend when Laravel should own the canonical behavior.",
            "Do not skip migrations, seeders, permission setup, reusable form components, or backend pagination where the feature clearly needs them.",
        ),
        expected_artifacts=(
            "Laravel routes, controllers, form requests, policies, actions or services, models, migrations, seeders, and tests as required by the feature.",
            "Inertia pages, React + TypeScript components, Tailwind or shadcn/ui composition, and reusable form or table components where the UI changes.",
            "Explicit handling of permissions, Socialite integrations when relevant, backend pagination, QA, deployment, and rollback-sensitive migrations or config changes.",
        ),
        preferred_practices=(
            "Keep business rules, permissions, and validation centered in Laravel while using Inertia page props intentionally.",
            "Prefer reusable Tailwind or shadcn/ui components, typed React props, backend pagination, and shared form patterns over feature-by-feature improvisation.",
            "Treat migrations, seeders, permission changes, QA, and controlled deployment as part of the feature's standard artifact set rather than optional cleanup.",
        ),
        plan_validation_checks=(
            "Confirm Laravel, Inertia, and React are the selected stack boundaries.",
            "Require route/controller/request/policy/page artifact coverage.",
            "Check server-side authorization and validation coverage.",
            "Require Inertia prop review for sensitive data.",
            "Require bounded report/export behavior and tests.",
        ),
        likely_project_shape=(
            "Laravel routes, controllers, form requests, policies, models, migrations, jobs, and tests.",
            "Inertia page components and React UI modules aligned to server props.",
            "Feature, policy, request validation, and critical React state tests.",
        ),
    ),
}


def write_stack_memory_files(project_root: Path, stack: MasStack) -> None:
    """Write MAS stack memory files for agent-readable project context."""
    memory_dir = project_root / ".specify" / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)
    files = {
        "stack.md": stack.render_stack_md(),
        "security-guidelines.md": stack.render_security_guidelines_md(),
        "stack-context.md": stack.render_stack_context_md(),
    }
    for filename, content in files.items():
        (memory_dir / filename).write_text(content, encoding="utf-8")


def valid_stack_ids() -> tuple[str, ...]:
    """Return canonical MAS stack IDs in display order."""
    return tuple(MAS_STACKS)


def get_mas_stack(stack_id: str | None) -> MasStack | None:
    """Return stack metadata for an exact canonical stack ID."""
    if stack_id is None:
        return None
    return MAS_STACKS.get(stack_id)


def format_valid_stack_ids() -> str:
    """Return valid stack IDs for CLI diagnostics."""
    return ", ".join(valid_stack_ids())


def example_stack_init_command() -> str:
    """Return a stable MAS init example for CLI diagnostics."""
    return "specify init . --integration codex --stack moodle5-plugin"
