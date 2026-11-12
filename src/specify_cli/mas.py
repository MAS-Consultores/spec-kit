"""MAS stack metadata for internal stack-aware initialization."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


MAS_CORE_PRESET_ID = "mas-core"
MAS_CORE_PRESET_PRIORITY = 10
MAS_STACK_PRESET_PRIORITY = 5

DEFAULT_ARTIFACT_LANGUAGE = "en"
DEFAULT_PRODUCT_LOCALE = "es-ES"


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
            **language_policy_init_options(),
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


def language_policy_init_options(
    artifact_language: str = DEFAULT_ARTIFACT_LANGUAGE,
    product_locale: str = DEFAULT_PRODUCT_LOCALE,
) -> dict[str, str]:
    """Return machine-readable language policy defaults for init-options.json."""
    return {
        "artifact_language": artifact_language,
        "product_locale": product_locale,
    }


def render_language_policy_md(
    artifact_language: str = DEFAULT_ARTIFACT_LANGUAGE,
    product_locale: str = DEFAULT_PRODUCT_LOCALE,
) -> str:
    """Render the MAS language policy for `.specify/memory/language-policy.md`."""
    return "\n".join([
        "# MAS Language Policy",
        "",
        f"**Artifact Language**: `{artifact_language}` (English)",
        f"**Product Locale**: `{product_locale}` (Spanish — Spain)",
        "",
        "## Purpose",
        "",
        "MAS projects separate **conversation language** from **persisted artifact "
        "language** from **product copy locale**. Agents must follow all three "
        "zones consistently.",
        "",
        "## Three Language Zones",
        "",
        "### 1. Conversation (match the user)",
        "",
        "- Respond to the user in the language they use (Spanish, Catalan, English, etc.).",
        "- Clarifying questions, summaries, and status updates belong in the user's language.",
        "- When the user switches language mid-session, follow their most recent messages.",
        "",
        "### 2. Persisted Artifacts (English only)",
        "",
        "Write and update these exclusively in English:",
        "",
        "- `.specify/memory/*` (constitution, stack memory, this file)",
        "- Feature `spec.md`, `plan.md`, `tasks.md`, checklists, and related SDD artifacts",
        "- Branch short names, file paths, API identifiers, and language string **keys**",
        "",
        "Requirements, user stories, acceptance criteria, functional requirements, and "
        "technical plans MUST be expressed in English even when the user described them "
        "in another language. Translate faithfully; do not drop nuance—ask in the user's "
        "language when meaning is ambiguous, then record the resolved requirement in English.",
        "",
        "### 3. User-Facing Copy (product locale)",
        "",
        "Text that end users see in the application stays in the **product locale** "
        f"(`{product_locale}` by default), quoted verbatim:",
        "",
        "- Button labels, titles, help text, validation messages, empty states",
        "- Notification and error strings shown in the UI",
        "- Marketing or instructional copy embedded in the product",
        "",
        "Do **not** translate product copy into English inside specs or plans. Capture it "
        "in dedicated sections (see spec and plan templates) with literal quoted strings.",
        "",
        "## Technical Identifiers",
        "",
        "Always use English for:",
        "",
        "- Git branch short names (e.g., `user-auth`, not `autenticacion-usuario`)",
        "- File and directory names",
        "- Code symbols, database columns, API endpoints where applicable",
        "- Moodle language string keys (e.g., `pluginname:submit`) — keys in English; "
        "values in the product locale",
        "",
        "## Moodle Language Strings",
        "",
        "For Moodle stacks (`moodle3`, `moodle5-plugin`, `moodle5-portal`):",
        "",
        "- Define new strings in `lang/en/` with English identifier keys.",
        f"- Provide product-locale values in `lang/es/` (or the project's `{product_locale}` locale).",
        "- List new or changed strings in the plan's **Language Strings & User-Facing Copy** "
        "section and in the spec's **User-Facing Copy** section.",
        "",
        "## Consumption",
        "",
        "| Workflow Stage | Read This File |",
        "| --- | --- |",
        "| All MAS workflow commands | `.specify/memory/language-policy.md` |",
        "| `speckit-specify`, `speckit-clarify` | Apply conversation + artifact rules |",
        "| `speckit-plan`, `speckit-tasks`, `speckit-implement` | English artifacts; preserve product copy |",
        "| `speckit-checklist` | Validate English artifacts + separated localized copy |",
        "",
        "Machine-readable defaults: `.specify/init-options.json` keys `artifact_language` "
        "and `product_locale`.",
        "",
    ])


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
    "moodle3": MasStack(
        id="moodle3",
        display_name="Moodle 3.x (Legacy Exception)",
        summary="Legacy Moodle 3.x maintenance on the documented exception track.",
        purpose=(
            "Sustained work on Moodle 3.x estates that are not yet on Moodle 5. "
            "Changes MUST preserve Moodle 3 stability while structuring implementation "
            "so migration to Moodle 5 is as expedited as possible. Moodle 3.x is not "
            "an approved company stack; every initiative MUST be treated as a "
            "documented exception with rationale, scope, approver, and migration path."
        ),
        when_to_use=(
            "The project still runs on Moodle 3.x and the change is approved under the legacy exception track with a recorded migration path to Moodle 5.",
            "The work is maintenance, security patching, or constrained plugin changes that must not destabilize the existing Moodle 3 instance.",
            "Implementation can follow Moodle 3 APIs today while mirroring Moodle 5 plugin patterns (capabilities, Files API, privacy metadata) where equivalents exist.",
        ),
        when_not_to_use=(
            "Greenfield products or new platforms that should target Moodle 5 Plugin, Moodle 5 Portal, or Laravel + Inertia + React directly.",
            "New privileged features on Moodle 3 without executive security sign-off.",
            "Work that assumes Moodle 5-only APIs, Bootstrap 5 UI, or behaviors that cannot be expressed on the Moodle 3 surface in use.",
        ),
        fixed_boundaries=(
            "Moodle 3.x is not an approved company stack; `Deviation / Exception Needed` MUST appear in the plan with approver and sunset date for Moodle 5 migration.",
            "Only vendor-supported security patches for the exact minor version in use are in scope; build numbers MUST be tracked.",
            "The Moodle 3 instance MUST be isolated from production Moodle 5 estates (network segmentation, dedicated credentials, separate backups).",
            "All entrypoints MUST use the Moodle 3 API surface actually available on the target instance.",
        ),
        security_profile=(
            "Moodle 3.x is not an approved company stack. Work on Moodle 3 MUST be "
            "treated as a documented exception in the implementation plan (rationale, "
            "scope, approver, and migration path). Security posture relies on patching, "
            "isolation, compensating controls, and an explicit sunset toward Moodle 5."
        ),
        security_controls=(
            "Record `Deviation / Exception Needed` in the plan with approver and sunset date for migration to Moodle 5.",
            "Apply only security patches from the vendor-supported line for the exact minor version in use; track build numbers.",
            "Isolate the instance (network segmentation, dedicated credentials, separate backups from production Moodle 5 estates).",
            "Restrict administrative access; enforce MFA at the identity provider or VPN layer when Moodle 3 lacks native MFA.",
            "Validate capabilities and contexts on every entrypoint (`require_login`, `require_capability`) for the Moodle 3 API surface in use.",
            "Use Moodle database APIs with placeholders; never concatenate user input into SQL.",
            "Use `format_string` / `format_text` for output; never echo raw user input.",
            "Use the Files API and `pluginfile.php` for user content; declare Privacy API metadata where personal data is stored.",
        ),
        sensitive_data_surfaces=(
            "User, grade, enrollment, course, cohort, and participation data on the legacy instance.",
            "Plugin tables, Moodle file areas, and backup or export outputs.",
            "AJAX endpoints, web services, scheduled tasks, and administrative scripts touching personal data.",
        ),
        security_pitfalls=(
            "Shipping new privileged features on Moodle 3 without executive security sign-off.",
            "Installing unmaintained third-party plugins without documented risk acceptance.",
            "Skipping `require_login` or `require_capability` on internal or AJAX entrypoints.",
            "Concatenating user input into `$DB` SQL instead of using bound parameters.",
            "Bypassing the Files API or serving user uploads from executable web paths.",
            "Omitting Privacy API metadata when storing or exporting personal data.",
            "Letting the instance share credentials, backups, or network paths with production Moodle 5 estates.",
        ),
        security_evidence=(
            "Plans MUST reference the Moodle 3 legacy exception track when the feature targets Moodle 3.",
            "Plans MUST list compensating controls: patch level, isolation measures, monitoring, and migration date.",
            "Plan records approver, exception rationale, scope boundaries, and sunset date for Moodle 5 migration.",
            "Plan attaches or references a milestone-level migration plan to Moodle 5 with data and capability mapping.",
            "QA notes cover capability denial paths and regression on supported Moodle 3 roles and contexts.",
        ),
        core_constraints=(
            "Preserve Moodle 3 production behavior; avoid changes that break enrolled users, upgrades, or installed plugins without explicit approval.",
            "Prefer Moodle 3-native APIs and plugin boundaries; do not patch core unless the exception record explicitly allows it.",
            "Structure plugin data, capabilities, events, and file handling so they map forward to Moodle 5 conventions where possible.",
            "Moodle implementations MUST reuse Moodle core APIs, database tables, capabilities, events, logging mechanisms, enrolment models, course and user APIs, access tracking, completion tracking, and reporting facilities before introducing custom tables or duplicated logic.",
            "Before any custom persistence or service, review official Moodle documentation and supported extension points for equivalent native capability.",
        ),
        typical_risks=(
            "Regression on legacy Moodle 3 themes, plugins, or customizations with narrow test coverage.",
            "Security exposure from unmaintained core, plugins, or missing patches on the exact minor version.",
            "Rework during Moodle 5 migration when code ignores forward-compatible capability, privacy, or Files API patterns.",
            "Operational confusion between isolated Moodle 3 estates and production Moodle 5 environments.",
        ),
        anti_patterns=(
            "Do not treat Moodle 3 as a permanent platform without a documented sunset and migration plan.",
            "Do not introduce Moodle 5-only UI or API assumptions into Moodle 3 deliverables.",
            "Do not ship exception-track work without executive approval for new privileged capabilities.",
            "Do not install unmaintained third-party plugins without documented risk acceptance.",
            "Do not create custom Moodle database tables for data Moodle core already stores or exposes—including users, courses, roles, enrolments, capabilities, logs, grades, access records, last access or activity records, or activity completion—unless documented architectural justification exists in the plan.",
            "Do not duplicate Moodle core data in plugin tables when the existing Moodle source of truth can be queried through supported APIs.",
            "Custom Moodle plugin tables MUST be limited to plugin-owned domain data not already represented by Moodle core or an existing supported plugin API.",
        ),
        expected_artifacts=(
            "Exception record in the plan: rationale, scope, approver, sunset date, and migration path to Moodle 5.",
            "Patch and minor-version inventory for the target Moodle 3 instance, including build numbers applied.",
            "Plugin or local changes with `version.php`, install/upgrade steps, capabilities, and privacy metadata appropriate to Moodle 3.",
            "Milestone-level migration plan to Moodle 5 with data model and capability mapping notes.",
            "QA coverage for affected roles, contexts, and regression-sensitive legacy flows.",
        ),
        preferred_practices=(
            "Mirror Moodle 5 plugin patterns (capabilities, contexts, Files API, privacy providers) when Moodle 3 supports equivalents.",
            "Keep diffs minimal, document forward-compatibility notes for the Moodle 5 migration team, and avoid optional abstractions that fight Moodle 3.",
            "Validate isolation, monitoring, and backup separation from Moodle 5 production estates before each release.",
        ),
        plan_validation_checks=(
            "Confirm `Deviation / Exception Needed` is recorded with approver and Moodle 5 sunset date.",
            "Reject new privileged features without executive security sign-off.",
            "Require compensating controls evidence: patch level, isolation, monitoring, and migration date.",
            "Require migration plan attachment with capability and data mapping toward Moodle 5.",
            "Reject unmaintained third-party plugins without documented risk acceptance.",
            "Before any custom database table, require `Native Capability Reuse Review` with relevant Moodle core tables and APIs documented.",
            "If Moodle already stores or exposes the required information, require consuming the existing Moodle source of truth instead of duplicating data.",
        ),
        likely_project_shape=(
            "Moodle 3 plugin or local extension directories with lang strings, db install/upgrade, and capability definitions.",
            "Exception and migration sections in plan.md tied to this stack memory.",
            "Regression tests or documented manual QA for supported Moodle 3 roles and contexts.",
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
            "Moodle implementations MUST reuse Moodle core APIs, database tables, capabilities, events, logging mechanisms, enrolment models, course and user APIs, access tracking, completion tracking, and reporting facilities before introducing custom tables or duplicated logic.",
            "Before any custom persistence or service, review official Moodle documentation and supported extension points for equivalent native capability.",
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
            "Do not create custom Moodle database tables for data Moodle core already stores or exposes—including users, courses, roles, enrolments, capabilities, logs, grades, access records, last access or activity records, or activity completion—unless documented architectural justification exists in the plan.",
            "Do not duplicate Moodle core data in plugin tables when the existing Moodle source of truth can be queried through supported APIs.",
            "Custom Moodle plugin tables MUST be limited to plugin-owned domain data not already represented by Moodle core or an existing supported plugin API.",
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
            "Before any custom database table, require `Native Capability Reuse Review` with relevant Moodle core tables and APIs documented.",
            "If Moodle already stores or exposes the required information, require consuming the existing Moodle source of truth instead of duplicating data.",
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
            "Moodle implementations MUST reuse Moodle core APIs, database tables, capabilities, events, logging mechanisms, enrolment models, course and user APIs, access tracking, completion tracking, and reporting facilities before introducing custom tables or duplicated logic.",
            "Before any custom persistence or service, review official Moodle documentation and supported extension points for equivalent native capability.",
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
            "Do not create custom Moodle database tables for data Moodle core already stores or exposes—including users, courses, roles, enrolments, capabilities, logs, grades, access records, last access or activity records, or activity completion—unless documented architectural justification exists in the plan.",
            "Do not duplicate Moodle core data in portal or plugin tables when the existing Moodle source of truth can be queried through supported APIs.",
            "Custom Moodle plugin tables MUST be limited to plugin-owned domain data not already represented by Moodle core or an existing supported plugin API.",
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
            "Before any custom database table, require `Native Capability Reuse Review` with relevant Moodle core tables and APIs documented.",
            "If Moodle already stores or exposes the required information, require consuming the existing Moodle source of truth instead of duplicating data.",
            "Reject custom tables or duplicated logic for last access, activity, enrolment, grade, capability, or log data when Moodle core already provides the required information.",
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
    "nestjs-react": MasStack(
        id="nestjs-react",
        display_name="NestJS + React (API + SPA)",
        summary="Monorepo with NestJS API backend (Prisma, PostgreSQL) and React SPA frontend communicating over HTTP.",
        purpose=(
            "Full-stack TypeScript applications structured as a monorepo with separated "
            "backend and frontend: `apps/api` (NestJS + Prisma + PostgreSQL REST API with "
            "OpenAPI) and `apps/web` (React + Vite SPA). Unlike Laravel + Inertia + React "
            "which is a single server-rendered application, this stack produces a decoupled "
            "API consumed by an independent SPA over HTTP with typed clients generated from "
            "OpenAPI."
        ),
        when_to_use=(
            "The project requires a decoupled API that can serve multiple clients (web, mobile, third-party integrations) independently.",
            "The backend needs PostgreSQL persistence with Prisma ORM, explicit migrations, and clean separation from presentation concerns.",
            "The frontend is a React TypeScript SPA built with Vite that consumes the API with typed clients generated from OpenAPI.",
            "The architecture benefits from independent deployment, scaling, and team ownership of API vs. frontend.",
        ),
        when_not_to_use=(
            "Moodle plugin or portal requests that need to live inside Moodle's ecosystem and Bootstrap 5 reality.",
            "Legacy CakePHP 2.x enhancements where compatibility matters more than adopting the modern stack.",
            "Laravel + Inertia + React projects where server-driven rendering with Inertia is the established pattern and a separate API is not needed.",
            "Simple admin panels or internal tools where a monolithic server-rendered approach (Laravel + Inertia) is more appropriate than a decoupled SPA.",
        ),
        fixed_boundaries=(
            "Monorepo structure: `apps/api` for NestJS backend, `apps/web` for React frontend.",
            "NestJS with Express adapter is the API boundary; Prisma ORM is the exclusive data access layer.",
            "PostgreSQL is the database; schema changes require `prisma migrate` with reviewed migration files.",
            "REST is the API style with mandatory OpenAPI documentation via `@nestjs/swagger`.",
            "React + Vite + TypeScript is the frontend boundary; API access uses typed clients generated from OpenAPI.",
            "Authentication uses HttpOnly cookies with CSRF protection; no JWT storage in localStorage.",
            "CORS is configured with explicit origin allowlist matching the frontend deployment URL.",
        ),
        security_profile=(
            "This stack separates API and SPA concerns, requiring security at both boundaries. "
            "The NestJS API enforces authentication via HttpOnly cookies and CSRF tokens, "
            "authorization via guards, and input validation via pipes. The React SPA must "
            "treat all authorization as advisory and include CSRF tokens in mutating requests. "
            "Prisma prevents SQL injection when used correctly, but raw queries and exposed "
            "model fields remain risks."
        ),
        security_controls=(
            "## API Security (`apps/api`)",
            "Apply a global `AuthGuard` that denies by default; mark public routes explicitly with `@Public()` decorator.",
            "Implement session-based authentication with HttpOnly, Secure, SameSite=Lax cookies; do not store tokens in localStorage or expose them to JavaScript.",
            "Generate and validate CSRF tokens for all state-changing requests; include CSRF token in a non-HttpOnly cookie or response header for the SPA to read and echo back.",
            "Enforce per-endpoint authorization with guards, RBAC policies, or CASL abilities; never rely on frontend-only checks.",
            "## Unified Validation with Zod",
            "Use Zod v4.2+ as the single validation library for REST DTOs, MCP tools, and shared contracts; do NOT use class-validator/class-transformer.",
            "Use `nestjs-zod` for REST: `createZodDto()` for DTOs, global `ZodValidationPipe`, and OpenAPI generation from Zod schemas.",
            "Configure Zod schemas as strict (reject unknown keys) to prevent payload pollution—equivalent to whitelist/forbidNonWhitelisted behavior.",
            "Define response schemas in Zod to explicitly control which fields are returned; use `.omit()` or `.pick()` to exclude sensitive fields.",
            "Share Zod schemas in `packages/contracts` for reuse between API, MCP tools, and React frontend (with React Hook Form + `zodResolver`).",
            "## Data Access Security",
            "Access configuration only through `ConfigService.getOrThrow()`; keep secrets in environment variables with `.env.example` as documentation; never commit `.env` files.",
            "Use Prisma Client for all database access; never use `$queryRawUnsafe()` with string interpolation. Use `$queryRaw` tagged templates only when raw SQL is unavoidable.",
            "Use `select` or `omit` in Prisma queries to avoid returning sensitive fields (passwords, tokens, internal flags); align Prisma select with response Zod schemas.",
            "Apply `prisma migrate deploy` for shared environments; never use `prisma db push` outside local development. Migrations must be reversible or document rollback.",
            "Configure `PrismaService` with proper lifecycle hooks (`onModuleInit`, `enableShutdownHooks`) for graceful connection management.",
            "Hash passwords with Argon2id via `argon2` package; never store plaintext credentials.",
            "## Rate Limiting and Headers",
            "Apply `@nestjs/throttler` with appropriate limits on login, password reset, and sensitive write endpoints.",
            "Enable Helmet middleware for security headers; configure CORS with explicit `origin` allowlist matching frontend URLs—never use `origin: '*'` or `credentials: true` with wildcard.",
            "Validate uploads server-side: check real MIME type against allowlist, enforce size limits, reject executable extensions, store outside public directory, serve through authenticated endpoints.",
            "Use a global exception filter that returns safe error responses in production; never expose stack traces, Prisma errors, or internal paths.",
            "Run `pnpm audit` in CI; resolve high and critical vulnerabilities before deployment.",
            "## REST API Documentation (Mandatory)",
            "Use `@nestjs/swagger` with `nestjs-zod` integration to generate OpenAPI from Zod schemas automatically.",
            "Every endpoint MUST have `@ApiTags`, `@ApiOperation`, and documented responses (success + applicable 400/401/403/404/422).",
            "Declare authentication on endpoints with `@ApiCookieAuth()` or `@ApiBearerAuth()` as applicable.",
            "Expose Swagger UI at `/docs` only outside production or behind authentication; never expose unauthenticated in production.",
            "Export `openapi.json` in CI and version it in the repository; fail CI if breaking changes are detected (use `openapi-diff` or equivalent).",
            "Use URI versioning (`/api/v1/...`) for API evolution; document versioning strategy.",
            "Return errors in RFC 9457 Problem Details format; document the standard error schema in OpenAPI.",
            "Document pagination schema (cursor or offset-based) in OpenAPI for all list endpoints.",
            "## MCP Security (`@nestjs/mcp`)",
            "Use the OFFICIAL `@nestjs/mcp` package with `@modelcontextprotocol/server` and Zod v4.2+; do NOT use `@rekog/mcp-nest` or deprecated SDK imports.",
            "Authenticate the `/mcp` endpoint as an OAuth 2.1 resource server; verify tokens and enforce per-tool scopes.",
            "Apply the same guards and `@Can()` policies to MCP tools as to REST endpoints; deny by default.",
            "Destructive or sensitive MCP tools MUST require explicit authorization, clear descriptions, and `annotations.destructiveHint` or equivalent metadata.",
            "Apply rate limiting to MCP tool invocations; log all tool calls for audit with caller identity and input summary.",
            "Never return secrets, credentials, tokens, or excessive data in MCP tool outputs; apply the same output filtering as REST responses.",
            "Treat MCP tool inputs as untrusted; validate with Zod schemas and be aware of prompt-injection risks—do not execute arbitrary code or queries from tool input.",
            "## Frontend Security (`apps/web`)",
            "Never store secrets, API keys, or auth tokens accessible to JavaScript; rely on HttpOnly cookies set by the API.",
            "Include CSRF token in all mutating requests (POST, PUT, PATCH, DELETE); read it from the designated cookie or header.",
            "Never use `dangerouslySetInnerHTML` without DOMPurify or equivalent sanitization.",
            "Generate typed API clients from the OpenAPI spec; do not hardcode endpoints or duplicate response types.",
            "Use shared Zod schemas from `packages/contracts` with React Hook Form and `zodResolver` for frontend validation.",
            "Use Content Security Policy headers served by the API or deployment platform to mitigate XSS.",
        ),
        sensitive_data_surfaces=(
            "User credentials, session cookies, CSRF tokens, and refresh tokens.",
            "Database records containing PII, internal IDs, or business-sensitive information.",
            "API responses that may inadvertently include Prisma model fields not intended for exposure.",
            "File uploads and downloads with user-provided content.",
            "Frontend state that may cache sensitive API responses.",
        ),
        security_pitfalls=(
            "Hallucinated NestJS imports or decorators that do not exist in the installed version (e.g., importing from wrong `@nestjs/*` package).",
            "Missing global `AuthGuard` registration, leaving endpoints unprotected by default.",
            "Storing auth tokens in localStorage instead of using HttpOnly cookies, exposing them to XSS.",
            "Missing or misconfigured CSRF protection, enabling cross-site request forgery.",
            "Using `prisma db push` in shared or production environments instead of `prisma migrate deploy`.",
            "Using `$queryRawUnsafe()` with string interpolation or concatenation, enabling SQL injection.",
            "Returning full Prisma models in responses without `select`/`omit`, leaking password hashes or internal fields.",
            "Committing `.env` files with production secrets to version control.",
            "Placing authorization logic only in React components without backend guard enforcement.",
            "Confusing `@nestjs/bull` with `@nestjs/bullmq`; they have different APIs and the former is deprecated.",
            "Using `origin: '*'` in CORS configuration with `credentials: true`, which browsers reject but indicates misconfiguration intent.",
            "Using `dangerouslySetInnerHTML` in React without sanitization, enabling XSS.",
            "Forgetting to include CSRF token in fetch/axios requests from the SPA.",
            "## Validation Pitfalls",
            "Using class-validator/class-transformer instead of Zod; the stack requires Zod v4.2+ everywhere.",
            "Using Zod v3 instead of v4.2+; older versions are incompatible with `@nestjs/mcp` and `nestjs-zod`.",
            "Not configuring Zod schemas as strict, allowing unknown keys to pass through (payload pollution).",
            "Defining validation schemas in multiple places instead of sharing from `packages/contracts`.",
            "## MCP Pitfalls",
            "Using `@rekog/mcp-nest` (community package) instead of official `@nestjs/mcp`.",
            "Using deprecated imports from `@modelcontextprotocol/sdk` instead of `@modelcontextprotocol/server`.",
            "Exposing `/mcp` endpoint without OAuth 2.1 authentication, allowing unauthorized tool access.",
            "Using request-scoped providers in MCP tools; MCP operates outside HTTP request lifecycle.",
            "MCP tools directly accessing Prisma instead of calling domain services, bypassing business logic and authorization.",
            "Not applying rate limiting to MCP endpoint, enabling abuse.",
            "Returning secrets or excessive data in MCP tool outputs.",
            "## Frontend Pitfalls",
            "Storing server state in Zustand instead of TanStack Query, leading to stale data and manual cache management.",
            "Using string-based routes instead of TanStack Router's type-safe route definitions.",
            "Making fetch calls outside the generated OpenAPI client, losing type safety and contract synchronization.",
            "Using CSS-in-JS runtime libraries instead of Tailwind CSS, adding bundle size and runtime overhead.",
        ),
        security_evidence=(
            "Plan lists guards and their registration scope (global, controller, or route level).",
            "Plan documents authentication flow: cookie configuration (HttpOnly, Secure, SameSite), CSRF token generation and validation, session lifecycle.",
            "Plan documents authorization strategy: RBAC roles, CASL policies, or custom guard logic per endpoint.",
            "Plan lists DTOs for each endpoint with validation decorators and response field selections.",
            "Plan confirms `ValidationPipe` global configuration with whitelist and transform options.",
            "Plan documents Prisma models touched, `select`/`omit` usage for responses, and migration strategy.",
            "Plan confirms CORS configuration with explicit origin allowlist.",
            "Plan lists upload endpoints with MIME validation rules, size limits, and storage paths.",
            "Plan confirms Helmet and throttler configuration for the deployment environment.",
            "QA covers authentication flows, CSRF validation, authorization denial paths, and input validation rejection.",
            "Frontend plan documents API client generation from OpenAPI and CSRF token inclusion in requests.",
            "Pull requests include `pnpm audit` results with remediation for high and critical severity issues.",
        ),
        core_constraints=(
            "## Monorepo Structure",
            "The project is a monorepo with `apps/api` (NestJS) and `apps/web` (React + Vite) as separate applications.",
            "Shared Zod schemas and contracts live in `packages/contracts`; this is the ONLY coupling between API and Web.",
            "Each app has independent build, test, and deployment pipelines.",
            "## Package Manager: pnpm",
            "pnpm is the package manager and build tool; do NOT use npm or yarn.",
            "`pnpm-workspace.yaml` defines workspaces: `apps/*` and `packages/*`.",
            "Root `package.json` must have `packageManager: 'pnpm@X.Y.Z'` for Corepack.",
            "`pnpm-lock.yaml` must be committed; CI uses `pnpm install --frozen-lockfile`.",
            "Internal packages use workspace protocol: `\"@project/contracts\": \"workspace:*\"`.",
            "Run scripts with `pnpm -r` (recursive all) or `pnpm --filter <app>` (single workspace).",
            "## Unified Validation: Zod Everywhere",
            "Zod v4.2+ is the ONLY validation library; do NOT use class-validator or class-transformer.",
            "REST DTOs use `nestjs-zod`: `createZodDto()` to create DTO classes from Zod schemas, global `ZodValidationPipe` for validation.",
            "MCP tool inputs use Zod schemas directly with `@nestjs/mcp`.",
            "Frontend forms use shared Zod schemas from `packages/contracts` with React Hook Form + `zodResolver`.",
            "All schemas must be strict (reject unknown keys) to prevent payload pollution.",
            "## REST API with Mandatory OpenAPI",
            "REST is the API style; all endpoints documented with `@nestjs/swagger` + `nestjs-zod` integration.",
            "OpenAPI spec generated from Zod schemas automatically; export `openapi.json` in CI and version in repo.",
            "Every endpoint: `@ApiTags`, `@ApiOperation`, success/error responses (400/401/403/404/422), auth declaration.",
            "URI versioning: `/api/v1/...`; RFC 9457 Problem Details for errors; standard pagination schema.",
            "Swagger UI at `/docs` outside production only or behind auth; detect breaking changes with `openapi-diff` in CI.",
            "Frontend typed client generated from OpenAPI (orval, openapi-typescript, or @hey-api/openapi-ts).",
            "## MCP Support (`@nestjs/mcp`)",
            "Use the OFFICIAL `@nestjs/mcp` package (`pnpm add @nestjs/mcp @modelcontextprotocol/server zod`); do NOT use `@rekog/mcp-nest`.",
            "`McpModule.forRoot({ name, version, instructions })` in `AppModule`; `/mcp` endpoint (Streamable HTTP, stateless) under global prefix.",
            "MCP tools/resources/prompts as decorated provider methods (`@Tool`, `@Resource`, `@Prompt`) in the owning domain module.",
            "Each domain module exposes its own MCP tools in `src/modules/<domain>/<domain>.mcp.ts`, reusing domain services—never bypass services to hit Prisma directly.",
            "MCP endpoint authenticated as OAuth 2.1 resource server; same guards/policies as REST; deny by default.",
            "Test MCP tools with the in-memory MCP test client from `@nestjs/mcp/testing`.",
            "## Modular API Architecture (`apps/api`)",
            "NestJS is the source of truth for routing, validation, authorization, business logic, and API contracts.",
            "One NestJS feature module per bounded context or domain: `src/modules/<domain>/` containing controller, service, DTOs (Zod), MCP tools, repository, and tests.",
            "Modules expose only what they explicitly export via `@Module({ exports: [...] })` and barrel `index.ts` files; internal classes remain private.",
            "No importing another module's internal files; cross-module communication uses exported services or the event system (`@nestjs/event-emitter`, CQRS where justified).",
            "Circular module dependencies are forbidden; `forwardRef()` is a code smell indicating poor boundary design—refactor to events or a shared abstraction.",
            "Shared infrastructure modules (`PrismaModule`, `ConfigModule`, `AuthModule`, `McpModule`, `CommonModule`) must remain thin: provide cross-cutting services, not domain logic.",
            "Prisma schema can be split per domain using `prismaSchemaFolder` (multi-file schema); each module's repository accesses only its own domain tables.",
            "No module may query another domain's Prisma models directly; cross-domain data access goes through the owning module's exported service.",
            "Prisma is the exclusive ORM; all schema changes go through `prisma migrate` with reviewed migration files.",
            "TypeScript strict mode is mandatory; no `any` types without explicit justification.",
            "## Modular Frontend Architecture (`apps/web`)",
            "React + Vite + TypeScript is the frontend stack; no server-side rendering in this app.",
            "Feature-based directory structure: `src/features/<domain>/` containing components, hooks, API client calls, routes, and tests.",
            "Each feature exposes a public surface via `index.ts` barrel; no cross-feature deep imports (e.g., `features/users/components/internal/...` is forbidden from another feature).",
            "Shared UI primitives live in `src/shared/ui/` or `packages/ui`; features import from shared, not from each other.",
            "All authorization is advisory; the API enforces access control.",
            "## Frontend Technology Stack",
            "**Router**: TanStack Router for type-safe routes and search params; file-based routes per feature with lazy loading; integrated with TanStack Query loaders.",
            "**Server State**: TanStack Query for cache, revalidation, and mutations; query keys organized per feature; generated OpenAPI client wrapped in custom query hooks inside each feature.",
            "**Global State**: Zustand for UI-only state (theme, sidebar, modals); React Context for dependency injection only. Server data MUST NOT be stored in Zustand—use TanStack Query.",
            "**Forms**: React Hook Form with `zodResolver`; schemas imported from `packages/contracts` (same Zod schemas used by API).",
            "**Styling**: Tailwind CSS with shadcn/ui components; shared components in `packages/ui` or `src/shared/ui/` (parity with Laravel + Inertia + React stack).",
            "**Testing**: Vitest + Testing Library for unit/component tests; Playwright for E2E tests.",
            "API communication uses typed clients generated from the OpenAPI spec; wrapped in TanStack Query hooks per feature.",
            "## Enforcing Module Boundaries",
            "Use static analysis to prevent boundary violations: `eslint-plugin-boundaries`, `@nx/enforce-module-boundaries` (if using Nx), or `dependency-cruiser`.",
            "Detect circular dependencies with `madge --circular` in CI.",
            "Configure import rules so features can only import from their own internals, shared packages, and other features' public barrels.",
            "## Contrast with Laravel + Inertia + React",
            "Laravel + Inertia + React is a monolithic server-rendered application where React components receive props from Laravel controllers via Inertia—there is no separate API.",
            "NestJS + React is a decoupled architecture: the API and SPA are independent modular applications communicating over HTTP with explicit contracts.",
            "Choose Laravel + Inertia for admin panels, internal tools, or applications where SSR and server-driven navigation are preferred.",
            "Choose NestJS + React when you need a standalone API, multiple frontend clients, modular bounded contexts, MCP tool exposure, or independent scaling of API and frontend.",
        ),
        typical_risks=(
            "Type safety gaps between Prisma models, DTOs, API responses, and frontend generated types leading to runtime errors.",
            "Guard or pipe misconfiguration leaving endpoints unprotected or rejecting valid requests.",
            "CSRF misconfiguration causing legitimate requests to fail or attacks to succeed.",
            "Cookie configuration errors (missing Secure flag, wrong SameSite, missing HttpOnly) weakening auth security.",
            "Migration failures or drift between development, staging, and production database schemas.",
            "Performance issues from N+1 queries, missing Prisma includes, or unbounded result sets.",
            "Frontend-backend contract drift when OpenAPI spec is not regenerated after API changes.",
            "CORS misconfiguration blocking legitimate frontend requests or allowing unintended origins.",
            "Module boundary erosion: features importing each other's internals, creating hidden coupling and blocking independent evolution.",
            "Circular dependencies between modules causing initialization failures or tight coupling that prevents extraction.",
            "Monolithic 'shared' or 'common' modules accumulating unrelated code, defeating the purpose of bounded contexts.",
        ),
        anti_patterns=(
            "Do not store auth tokens in localStorage or sessionStorage; use HttpOnly cookies.",
            "Do not bypass Prisma with raw SQL unless documented as a deviation; when unavoidable, use `$queryRaw` tagged templates only.",
            "Do not place authorization logic only in React; the API must enforce all access control.",
            "Do not return full Prisma models in API responses; always use response Zod schemas with explicit field selection.",
            "Do not use `prisma db push` in shared environments; always use `prisma migrate deploy` with reviewed migrations.",
            "Do not commit secrets or use hardcoded credentials; all sensitive configuration comes from environment variables.",
            "Do not skip OpenAPI client regeneration after API changes; keep frontend types synchronized.",
            "Do not use `origin: '*'` in CORS when credentials are enabled.",
            "## Package Manager Anti-Patterns",
            "Do not use npm or yarn; pnpm is the required package manager.",
            "Do not commit `package-lock.json` or `yarn.lock`; only `pnpm-lock.yaml` is allowed.",
            "Do not use `npm install` or `yarn install` in CI; use `pnpm install --frozen-lockfile`.",
            "Do not use `npm audit` or `yarn audit`; use `pnpm audit`.",
            "Do not use `^` or `~` for internal workspace dependencies; use `workspace:*` protocol.",
            "## Validation Anti-Patterns",
            "Do not use class-validator or class-transformer; Zod v4.2+ is the only validation library.",
            "Do not use Zod v3; v4.2+ is required for `@nestjs/mcp` and `nestjs-zod` compatibility.",
            "Do not disable strict mode on Zod schemas; unknown keys must be rejected.",
            "## MCP Anti-Patterns",
            "Do not use `@rekog/mcp-nest` or deprecated `@modelcontextprotocol/sdk` imports; use official `@nestjs/mcp` + `@modelcontextprotocol/server`.",
            "Do not use request-scoped providers for MCP tools; MCP operates outside the HTTP request lifecycle.",
            "Do not expose `/mcp` endpoint without authentication; it must be protected as OAuth 2.1 resource server.",
            "Do not let MCP tools bypass domain services to access Prisma directly; tools must call the owning module's service.",
            "## Architecture Anti-Patterns",
            "Do not organize by technical layer (all controllers together, all services together); organize by feature module.",
            "Do not create 'god services' that handle multiple unrelated concerns; each service should have a single responsibility.",
            "Do not resolve services dynamically via `ModuleRef.get()` (service locator pattern); declare dependencies in constructor.",
            "Do not provide the same service in multiple modules; create a dedicated module that exports it and import that module.",
            "Do not swallow errors silently; log with context before converting to user-safe messages.",
            "Do not use property injection (`@Inject()` on properties); use constructor injection for explicit, testable dependencies.",
            "## Modularity Anti-Patterns",
            "Do not import another module's internal files; use only the module's public exports via its barrel `index.ts`.",
            "Do not use `forwardRef()` to resolve circular dependencies; refactor module boundaries or use events instead.",
            "Do not let shared/common modules grow into catch-all containers; each utility must have a clear owner or live in a dedicated thin module.",
            "Do not query another domain's Prisma models directly from a module; call the owning module's service instead.",
            "Do not create cross-feature imports in the frontend (e.g., `import { X } from '../users/components/internal/...'`); features expose public APIs only.",
            "Do not skip lazy-loading for feature routes; eager-loading all features defeats code splitting.",
            "Do not couple API and Web directly; the only allowed coupling is through `packages/contracts` (Zod schemas) or the generated OpenAPI client.",
            "## Frontend Anti-Patterns",
            "Do not store server data in Zustand; use TanStack Query for all server state (cache, loading, errors, mutations).",
            "Do not use untyped routes; TanStack Router provides type-safe routes and search params—use them.",
            "Do not make ad-hoc fetch calls outside the generated OpenAPI client; wrap the client in TanStack Query hooks per feature.",
            "Do not use CSS-in-JS runtime libraries (styled-components, Emotion); use Tailwind CSS for styling.",
            "Do not create custom form validation logic; use React Hook Form with `zodResolver` and shared Zod schemas from `packages/contracts`.",
            "Do not scatter shadcn/ui components across features; shared UI lives in `packages/ui` or `src/shared/ui/`.",
        ),
        expected_artifacts=(
            "## Monorepo Root",
            "`pnpm-workspace.yaml` with `apps/*` and `packages/*`; `pnpm-lock.yaml` committed.",
            "Root `package.json` with `packageManager` field pinning pnpm version; Corepack enabled.",
            "Shared TypeScript configuration and linting rules.",
            "ESLint configuration with import boundary rules (`eslint-plugin-boundaries` or `@nx/enforce-module-boundaries`).",
            "CI steps: `pnpm install --frozen-lockfile`, `madge --circular` for cycles, `openapi-diff` for breaking API changes, `pnpm audit`.",
            "## API (`apps/api`) — Modular Structure",
            "Each domain as a NestJS module under `src/modules/<domain>/` with:",
            "  - `<domain>.module.ts` — NestJS module with explicit exports",
            "  - `<domain>.controller.ts` — REST endpoints with `@ApiTags`, `@ApiOperation`, response decorators",
            "  - `<domain>.service.ts` — Business logic",
            "  - `<domain>.mcp.ts` — MCP tools (`@Tool`, `@Resource`, `@Prompt`) reusing domain service (optional per module)",
            "  - `dto/` — Zod schemas wrapped with `createZodDto()` for request/response",
            "  - `entities/` or `repositories/` — Prisma access layer",
            "  - `__tests__/` — Unit tests (Jest) including MCP tool tests with in-memory client",
            "  - `index.ts` — Barrel exporting public API only",
            "Thin infrastructure modules: `PrismaModule`, `ConfigModule`, `AuthModule`, `McpModule`, `CommonModule`.",
            "`McpModule.forRoot({ name, version, instructions })` in `AppModule`; `/mcp` endpoint with OAuth 2.1 auth.",
            "Prisma schema in `prisma/schema.prisma` (or split via `prismaSchemaFolder`); `prisma/migrations/`.",
            "OpenAPI specification generated from Zod schemas via `nestjs-zod`; `openapi.json` versioned in repo.",
            "Swagger UI at `/docs` (disabled or auth-protected in production).",
            "Jest unit tests per module; e2e tests for REST and MCP flows using supertest and MCP test client.",
            "Environment configuration with `.env.example` documenting all required variables.",
            "## Frontend (`apps/web`) — Modular Structure",
            "Each domain as a feature under `src/features/<domain>/` with:",
            "  - `components/` — Feature-specific React components",
            "  - `hooks/` — TanStack Query hooks wrapping generated API client",
            "  - `api/` — Feature-specific query keys and mutations",
            "  - `routes/` — TanStack Router file-based routes (lazy-loaded)",
            "  - `__tests__/` — Vitest + Testing Library tests",
            "  - `index.ts` — Barrel exporting public API only",
            "TanStack Router configuration with type-safe routes and search params.",
            "TanStack Query provider and devtools configuration.",
            "Zustand stores in `src/stores/` for UI-only state (theme, sidebar, modals).",
            "React Hook Form with `zodResolver` using schemas from `packages/contracts`.",
            "Shared UI in `src/shared/ui/` or `packages/ui` using shadcn/ui + Tailwind CSS.",
            "Generated typed API client from OpenAPI spec (orval, @hey-api/openapi-ts, or openapi-typescript).",
            "Vitest + Testing Library for unit/component tests; Playwright for E2E in `e2e/`.",
            "## Contracts (`packages/contracts`)",
            "Shared Zod schemas for validation (used by API DTOs, MCP tools, and React forms).",
            "Shared TypeScript types derived from Zod schemas (`.infer<typeof schema>`).",
            "Generated OpenAPI client may live here or be generated into `apps/web` from versioned spec.",
            "## Shared UI (`packages/ui`)",
            "shadcn/ui components customized for the project.",
            "Tailwind CSS configuration shared with `apps/web`.",
        ),
        preferred_practices=(
            "## Validation Practices",
            "Define all validation schemas in Zod v4.2+ with strict mode (reject unknown keys).",
            "Share schemas in `packages/contracts`; import into API (via `createZodDto`), MCP tools, and React forms (`zodResolver`).",
            "Use `.pick()`, `.omit()`, and `.extend()` to derive request/response schemas from base entity schemas.",
            "## Architecture Practices",
            "Organize by feature modules, not technical layers; each module contains controller, service, DTOs, repository, MCP tools, and tests together.",
            "Avoid circular module dependencies; they indicate poor boundaries—extract shared logic to a third module or use events.",
            "Each service should have a single responsibility; avoid 'god services' that handle multiple unrelated concerns.",
            "Use event-driven architecture (`@nestjs/event-emitter`) for loose coupling between modules; prefer events over direct service injection when modules should evolve independently.",
            "Apply the repository pattern: encapsulate Prisma access in repository classes within each module; controllers and MCP tools call services, services call repositories.",
            "## Dependency Injection Practices",
            "Prefer constructor injection over property injection; it makes dependencies explicit and testable.",
            "Avoid the service locator anti-pattern (dynamically resolving services at runtime via `ModuleRef.get()`); declare dependencies in constructor.",
            "Understand provider scopes: use `SINGLETON` (default) for stateless services, `REQUEST` for request-specific state (rare), `TRANSIENT` for unique instances (rare). MCP tools require singleton scope.",
            "Use injection tokens (`Symbol` or `InjectionToken`) when injecting interfaces; NestJS needs a concrete token at runtime.",
            "Never provide the same service in multiple modules; create a dedicated module that exports the service and import that module where needed.",
            "## Error Handling Practices",
            "Use a global exception filter to catch all unhandled errors and return consistent RFC 9457 Problem Details responses.",
            "Throw NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, etc.) from services when business rules fail; the filter converts them.",
            "Handle async errors properly: always `await` async operations or return the Promise; unhandled rejections crash the process.",
            "Never swallow errors silently; log them with context (module, action, entity ID) before converting to user-safe messages.",
            "## Performance Practices",
            "Implement `onModuleInit` and `onModuleDestroy` lifecycle hooks correctly: make them `async` and `await` all setup/teardown operations.",
            "Use caching strategically with `@nestjs/cache-manager` for expensive queries; invalidate on writes.",
            "Lazy-load large feature modules using `LazyModuleLoader` to reduce cold-start time.",
            "Avoid N+1 queries: use Prisma's `include` or `select` with nested relations, or batch queries with `findMany` where appropriate.",
            "## Database Practices",
            "Wrap multi-step operations in Prisma transactions (`prisma.$transaction`) to maintain consistency.",
            "Always use `prisma migrate` for schema changes; never modify production schemas manually or with `db push`.",
            "Index frequently queried columns; use `@@index` in Prisma schema for composite indexes.",
            "## API Modularity",
            "Structure API as one NestJS module per bounded context under `src/modules/<domain>/` with controller, service, DTOs (Zod), MCP tools, repository, and tests.",
            "Define explicit module boundaries: export only the service and public DTOs via `@Module({ exports: [...] })` and `index.ts`.",
            "Use `@nestjs/event-emitter` or CQRS for cross-module communication instead of direct service injection when modules should remain decoupled.",
            "Keep infrastructure modules (`PrismaModule`, `ConfigModule`, `AuthModule`, `McpModule`) thin; they provide utilities, not domain logic.",
            "Consider Prisma multi-file schema (`prismaSchemaFolder`) to co-locate schema definitions with their owning modules.",
            "## REST API Practices",
            "Use `nestjs-zod` for all DTOs: `createZodDto(schema)` creates the DTO class, global `ZodValidationPipe` validates.",
            "OpenAPI generated from Zod schemas automatically; add `@ApiTags`, `@ApiOperation`, `@ApiResponse` for documentation.",
            "Version API with URI prefix (`/api/v1`); detect breaking changes with `openapi-diff` in CI.",
            "Return RFC 9457 Problem Details for all errors; document in OpenAPI.",
            "Use interceptors for cross-cutting concerns (logging, timing, response transformation); avoid duplicating logic across controllers.",
            "## MCP Practices",
            "Add MCP tools to domain modules in `<domain>.mcp.ts`; tools call the domain service, never Prisma directly.",
            "Authenticate `/mcp` as OAuth 2.1 resource server; apply same guards as REST.",
            "Document tool descriptions and annotations clearly; mark destructive tools with appropriate hints.",
            "Test MCP tools with `@nestjs/mcp/testing` in-memory client.",
            "## Testing Practices",
            "Use `@nestjs/testing` `Test.createTestingModule()` for unit tests; mock dependencies via `useValue` or `useFactory`.",
            "Write e2e tests with `supertest` against a test application instance; use separate test database.",
            "Mock external services (HTTP clients, message queues) in tests; never call real external APIs.",
            "Test MCP tools with the in-memory client; verify input validation, authorization, and output shape.",
            "## Frontend Practices",
            "Structure frontend as one feature per domain under `src/features/<domain>/` with components, hooks, API calls, routes, and tests.",
            "Each feature exposes a public barrel (`index.ts`); other features and the router import only from this barrel.",
            "Place shared UI primitives in `src/shared/ui/` or `packages/ui` using shadcn/ui + Tailwind CSS.",
            "Use TanStack Router for type-safe routes with file-based routing per feature; lazy-load all feature routes.",
            "Use TanStack Query for all server state; wrap generated OpenAPI client in query hooks per feature.",
            "Use Zustand only for UI state (theme, modals, sidebar); never store server data in Zustand.",
            "Use React Hook Form with `zodResolver` and schemas from `packages/contracts` for all forms.",
            "Keep React components focused on presentation; move data fetching to TanStack Query hooks.",
            "## Monorepo Practices",
            "Use `packages/contracts` for shared Zod schemas; this is the single validation coupling point between API and Web.",
            "Use `packages/ui` for shared shadcn/ui components and Tailwind config.",
            "Run `madge --circular` in CI to fail builds with circular dependencies.",
            "Run `openapi-diff` in CI to detect breaking API contract changes.",
            "Configure `eslint-plugin-boundaries` or `@nx/enforce-module-boundaries` to enforce import rules statically.",
        ),
        plan_validation_checks=(
            "Confirm monorepo structure with `apps/api` and `apps/web` as separate applications.",
            "Confirm NestJS, Prisma, PostgreSQL, React, Vite, TanStack Router, and TanStack Query are the selected stack boundaries.",
            "Verify authentication uses HttpOnly cookies with CSRF protection, not localStorage tokens.",
            "Verify global `AuthGuard` is registered and `@Public()` routes are explicitly marked.",
            "Confirm CORS configuration with explicit origin allowlist.",
            "## Validation Checks",
            "Confirm Zod v4.2+ is the only validation library; reject class-validator/class-transformer usage.",
            "Confirm all DTOs use `nestjs-zod` with `createZodDto()` and global `ZodValidationPipe`.",
            "Confirm Zod schemas are strict (reject unknown keys).",
            "Confirm shared schemas live in `packages/contracts` and are reused by API, MCP tools, and React forms.",
            "## REST API Checks",
            "For each new/changed endpoint: confirm documented in OpenAPI with `@ApiTags`, `@ApiOperation`, response decorators.",
            "Confirm OpenAPI spec (`openapi.json`) is versioned in repo and frontend client regenerated.",
            "Confirm `openapi-diff` runs in CI to detect breaking changes.",
            "Confirm error responses use RFC 9457 Problem Details format.",
            "Confirm pagination schema documented for list endpoints.",
            "Map each endpoint to its guard, Zod DTO, and response schema; confirm Prisma `select`/`omit` aligns with response schema.",
            "## MCP Checks",
            "Confirm `@nestjs/mcp` is used (not `@rekog/mcp-nest`).",
            "For each MCP tool: confirm owning module, Zod input schema, required scopes/policy, and tests with in-memory client.",
            "Confirm MCP tools call domain services, not Prisma directly.",
            "Confirm `/mcp` endpoint is authenticated as OAuth 2.1 resource server.",
            "Confirm destructive tools have clear descriptions and authorization requirements.",
            "## Data Access Checks",
            "Require Prisma migration files for all schema changes; reject `db push` for non-local environments.",
            "Require test coverage for guards, services, MCP tools, and critical API flows.",
            "Check that no secrets are hardcoded; all sensitive values come from environment configuration.",
            "## Modularity Validation",
            "For each new API feature: confirm it is a dedicated NestJS module under `src/modules/<domain>/` with controller, service, Zod DTOs, MCP tools (if any), and tests.",
            "For each new API module: document its public exports and dependencies.",
            "Reject direct imports of another module's internal files; require barrel imports only.",
            "Reject `forwardRef()` usage; require events or shared abstractions.",
            "## Frontend Validation",
            "For each new frontend feature: confirm it is under `src/features/<domain>/` with components, TanStack Query hooks, TanStack Router routes, and tests.",
            "Confirm feature routes use TanStack Router with type-safe definitions and lazy loading.",
            "Confirm server state uses TanStack Query, not Zustand; Zustand is for UI state only.",
            "Confirm forms use React Hook Form with `zodResolver` and schemas from `packages/contracts`.",
            "Confirm styling uses Tailwind CSS + shadcn/ui; reject CSS-in-JS runtime libraries.",
            "Confirm no deep imports from other features; features expose public APIs via `index.ts` only.",
            "## Monorepo Validation",
            "Confirm `packages/contracts` contains shared Zod schemas as the only coupling between API and Web.",
            "Confirm `packages/ui` contains shared shadcn/ui components.",
            "Require ESLint boundary rules or dependency-cruiser config that enforces module isolation.",
            "Require `madge --circular` in CI for cycle detection.",
        ),
        likely_project_shape=(
            "## Monorepo Root",
            "`pnpm-workspace.yaml` defining `apps/*` and `packages/*`.",
            "Root `package.json` with `packageManager: 'pnpm@X.Y.Z'` for Corepack; NO npm or yarn lockfiles.",
            "`pnpm-lock.yaml` committed; use `pnpm install --frozen-lockfile` in CI.",
            "`turbo.json` or `nx.json` if using a build orchestrator for caching and task pipelines.",
            "`.eslintrc` with `eslint-plugin-boundaries` or equivalent rules enforcing import boundaries.",
            "CI configuration: `pnpm install --frozen-lockfile`, `madge --circular`, `openapi-diff`, `pnpm audit`.",
            "Internal packages reference each other via workspace protocol: `\"packages/contracts\": \"workspace:*\"`.",
            "Scripts run via `pnpm -r <script>` (recursive) or `pnpm --filter <app> <script>`.",
            "Docker Compose for local PostgreSQL; root `.env.example` with shared variables.",
            "## API (`apps/api/`)",
            "`src/modules/<domain>/` — One directory per bounded context, each containing:",
            "  - `<domain>.module.ts` — NestJS module with explicit exports",
            "  - `<domain>.controller.ts` — REST endpoints with OpenAPI decorators",
            "  - `<domain>.service.ts` — Business logic",
            "  - `<domain>.mcp.ts` — MCP tools using `@Tool`/`@Resource`/`@Prompt` (optional)",
            "  - `dto/` — Zod schemas + `createZodDto()` wrappers for request/response",
            "  - `entities/` or `repositories/` — Prisma access layer",
            "  - `__tests__/` — Jest unit tests including MCP tool tests",
            "  - `index.ts` — Barrel exporting public API only",
            "`src/common/` or `src/core/` — Thin infrastructure modules:",
            "  - `PrismaModule` — Database access",
            "  - `ConfigModule` — Environment configuration",
            "  - `AuthModule` — Authentication guards and strategies",
            "  - `McpModule.forRoot()` — MCP server configuration",
            "`prisma/schema.prisma` (or `prisma/schema/` multi-file); `prisma/migrations/`.",
            "`openapi.json` — Versioned OpenAPI spec generated from Zod schemas.",
            "`test/` — e2e tests using supertest and MCP test client.",
            "`.env.example` documenting required environment variables.",
            "## Frontend (`apps/web/`)",
            "`src/features/<domain>/` — One directory per feature, each containing:",
            "  - `components/` — Feature-specific React components",
            "  - `hooks/` — TanStack Query hooks wrapping API client",
            "  - `api/` — Query keys, mutations, generated client calls",
            "  - `routes/` — TanStack Router file-based routes (lazy-loaded)",
            "  - `__tests__/` — Vitest + Testing Library tests",
            "  - `index.ts` — Barrel exporting public API only",
            "`src/shared/ui/` — Shared UI components using shadcn/ui + Tailwind CSS.",
            "`src/stores/` — Zustand stores for UI-only state (theme, modals, sidebar).",
            "`src/routes/` — TanStack Router root configuration with type-safe routes.",
            "`src/lib/` — TanStack Query client, API client instance, utilities.",
            "Generated API client from OpenAPI spec (orval, @hey-api/openapi-ts).",
            "`e2e/` — Playwright E2E tests.",
            "`vite.config.ts` with React and Tailwind CSS plugins.",
            "## Contracts (`packages/contracts/`)",
            "Shared Zod schemas for validation across API, MCP, and React forms.",
            "TypeScript types derived from Zod (`.infer<typeof schema>`).",
            "This package is the ONLY coupling between `apps/api` and `apps/web`.",
            "## UI Library (`packages/ui/`)",
            "shadcn/ui components customized for the project.",
            "Shared Tailwind CSS configuration (`tailwind.config.ts`).",
            "Component documentation with Storybook (optional).",
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
        "language-policy.md": render_language_policy_md(),
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
