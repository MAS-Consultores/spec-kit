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
    when_to_use: tuple[str, ...]
    when_not_to_use: tuple[str, ...]
    fixed_boundaries: tuple[str, ...]
    security_profile: str
    required_security_checks: tuple[str, ...]
    sensitive_data_surfaces: tuple[str, ...]
    high_risk_patterns: tuple[str, ...]
    core_constraints: tuple[str, ...]
    anti_patterns: tuple[str, ...]
    expected_artifacts: tuple[str, ...]
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
            "## Required Checks",
            "",
            _bullets(self.required_security_checks),
            "",
            "## Sensitive Data Surfaces",
            "",
            _bullets(self.sensitive_data_surfaces),
            "",
            "## Prohibited Or High-Risk Patterns",
            "",
            _bullets(self.high_risk_patterns),
            "",
            "## Plan Validation Use",
            "",
            "Plans must cite how each required check is satisfied, mark it not "
            "applicable with a reason, or document an explicit approved "
            "deviation.",
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
            "## Anti-Patterns",
            "",
            _bullets(self.anti_patterns),
            "",
            "## Expected Artifacts",
            "",
            _bullets(self.expected_artifacts),
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
        summary="Legacy CakePHP platform evolution backed by MySQL.",
        when_to_use=(
            "Enhancing an existing CakePHP 2.x platform.",
            "Adding administrative, coordinator, reporting, export, course, or classroom flows to a legacy system.",
            "Making constrained changes where framework migration is not in scope.",
        ),
        when_not_to_use=(
            "New greenfield portals or modern SPA products.",
            "Moodle plugin behavior or Moodle portal integration.",
            "Projects where migration away from CakePHP 2.x is the primary approved scope.",
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
        required_security_checks=(
            "Validate request data through CakePHP 2.x-compatible validation mechanisms.",
            "Use parameterized queries, ORM/query builder paths, or reviewed prepared statements.",
            "Check authorization for each controller action, administrative flow, report, and export.",
            "Review file upload, generated file, and export paths for traversal, leakage, and retention risks.",
        ),
        sensitive_data_surfaces=(
            "Legacy user, course, classroom, coordinator, and administrative records.",
            "Report and export outputs generated from MySQL queries.",
            "Uploaded files, temporary generated files, and session-linked records.",
        ),
        high_risk_patterns=(
            "Raw SQL without parameter binding or review.",
            "Bypassing legacy authorization/session conventions.",
            "Unbounded report queries or exports.",
            "Framework migration hidden inside a feature change.",
        ),
        core_constraints=(
            "Preserve CakePHP 2.x conventions and existing legacy behavior.",
            "Treat MySQL schema changes as controlled migrations with rollback notes.",
            "Keep changes localized when modifying legacy flows.",
        ),
        anti_patterns=(
            "Introducing Laravel, modern CakePHP, or SPA architecture inside this stack.",
            "Adding direct SQL for convenience without a security and performance review.",
            "Changing authentication/session behavior without explicit scope.",
        ),
        expected_artifacts=(
            "Impact analysis for touched controllers, models, views, helpers, components, and routes.",
            "Data model or schema migration notes.",
            "Regression test plan focused on legacy flows.",
            "Query/export performance and rollback notes where applicable.",
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
        display_name="Moodle 5 -- Plugin",
        summary="Moodle plugin extension work inside Moodle 5.",
        when_to_use=(
            "Building or modifying a Moodle plugin.",
            "Adding course, activity, block, local, report, admin, or classroom behavior inside Moodle.",
            "Implementing Moodle-specific reporting or coordinator tooling as a plugin.",
        ),
        when_not_to_use=(
            "Standalone portals outside Moodle.",
            "Direct Moodle core modifications.",
            "General Laravel admin products or legacy CakePHP maintenance.",
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
        required_security_checks=(
            "Define and use Moodle capabilities for each entry point.",
            "Check context and role scope before showing, changing, exporting, or syncing data.",
            "Provide privacy provider behavior for personal data.",
            "Protect AJAX, external services, observers, and scheduled tasks with authentication and capability checks.",
        ),
        sensitive_data_surfaces=(
            "User, grade, enrollment, course, cohort, and participation data.",
            "Plugin tables and Moodle file areas.",
            "AJAX endpoints, external services, scheduled tasks, events, and exports.",
        ),
        high_risk_patterns=(
            "Modifying Moodle core.",
            "Skipping capability checks at page, AJAX, or service entry points.",
            "Using direct database access where Moodle APIs are required.",
            "Omitting privacy provider impact for personal data.",
        ),
        core_constraints=(
            "Use Moodle 5 APIs and plugin layout for the selected plugin type.",
            "Respect Moodle install, upgrade, backup/restore, and coding conventions.",
            "Define capabilities, roles, events, tasks, and privacy behavior.",
        ),
        anti_patterns=(
            "Implementing plugin behavior as Moodle core patches.",
            "Hardcoding role assumptions instead of capabilities and contexts.",
            "Bypassing Moodle form, output, file, or database APIs without justification.",
        ),
        expected_artifacts=(
            "Plugin type and directory layout.",
            "Capability matrix and role mapping.",
            "Database install/upgrade notes if tables change.",
            "Privacy provider and data exposure notes.",
            "Moodle test plan for supported roles.",
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
        display_name="Moodle 5 -- Portal",
        summary="Moodle portal integration and customization.",
        when_to_use=(
            "Building a portal that depends on Moodle data or Moodle authentication.",
            "Creating learner, coordinator, administrative, reporting, or export flows adjacent to Moodle.",
            "Aggregating Moodle data with company-specific business processes.",
        ),
        when_not_to_use=(
            "Code that must be packaged as a Moodle plugin.",
            "Legacy CakePHP platform maintenance.",
            "Portals with no Moodle dependency.",
        ),
        fixed_boundaries=(
            "Moodle is treated as an external system with explicit integration boundaries.",
            "Authentication, SSO, session, and user identity mapping must be defined.",
            "Direct Moodle database coupling requires an explicit approved deviation.",
        ),
        security_profile=(
            "Moodle portals sit outside or adjacent to Moodle and must preserve "
            "Moodle identity, visibility, and data access boundaries while "
            "adding business-specific flows."
        ),
        required_security_checks=(
            "Define authentication, SSO, session, and identity mapping.",
            "Mirror Moodle visibility constraints for courses, cohorts, roles, users, grades, and reports.",
            "Define data ownership, retention, freshness, and deletion behavior for copied Moodle-origin data.",
            "Audit cross-system actions that affect learners, courses, enrollments, grades, or coordinator decisions.",
        ),
        sensitive_data_surfaces=(
            "Moodle-origin user, course, cohort, enrollment, grade, and participation data.",
            "SSO/session handoff and identity mapping records.",
            "Portal dashboards, reports, exports, and synchronized data stores.",
        ),
        high_risk_patterns=(
            "Direct Moodle database access without approved deviation.",
            "Portal permissions that are broader than Moodle visibility.",
            "Unbounded synchronization or retention of Moodle-origin data.",
            "SSO/session flows without failure and audit design.",
        ),
        core_constraints=(
            "Define the integration boundary between the portal and Moodle.",
            "Preserve Moodle visibility rules in portal authorization.",
            "Document sync ownership, freshness, retries, and failure behavior.",
        ),
        anti_patterns=(
            "Treating Moodle as a generic database.",
            "Duplicating Moodle data without retention and deletion rules.",
            "Implementing reports that ignore Moodle role, course, or cohort visibility.",
        ),
        expected_artifacts=(
            "Integration boundary description.",
            "Auth/SSO and identity mapping notes.",
            "Data flow and synchronization model.",
            "Permission and visibility matrix.",
            "Report/export data handling notes.",
        ),
        plan_validation_checks=(
            "Confirm Moodle integration boundaries are explicit.",
            "Require auth/SSO, identity, and permission mapping.",
            "Flag direct Moodle database access as a deviation.",
            "Require synchronization and failure-mode design when data is copied.",
        ),
        likely_project_shape=(
            "Portal application modules for auth, Moodle integration, dashboards, reports, and exports.",
            "Integration clients, synchronization jobs, and audit logging paths.",
            "Tests for role visibility, SSO/session behavior, sync failure, and export scope.",
        ),
    ),
    "laravel-inertia-react": MasStack(
        id="laravel-inertia-react",
        display_name="Laravel + Inertia + React",
        summary="Modern Laravel/Inertia/React portal or admin product delivery.",
        when_to_use=(
            "Building a new MAS portal or administrative product.",
            "Creating modern coordinator or back-office workflows.",
            "Implementing reporting/export-heavy systems with controlled access.",
        ),
        when_not_to_use=(
            "Maintaining an existing CakePHP 2.x platform.",
            "Writing a Moodle plugin.",
            "Building a public API-first product where Inertia is not appropriate.",
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
        required_security_checks=(
            "Enforce authorization server-side through policies, gates, middleware, or controller checks.",
            "Validate all request payloads, filters, uploads, and export parameters through form requests or equivalent validators.",
            "Keep sensitive data out of Inertia props unless required and authorized.",
            "Protect CSRF, session, SSO callback, password reset, file upload, and export flows.",
        ),
        sensitive_data_surfaces=(
            "Inertia props carrying user, role, report, export, or administrative data.",
            "Laravel sessions, SSO callbacks, CSRF-protected actions, uploads, and downloads.",
            "Report filters, generated exports, and back-office administrative actions.",
        ),
        high_risk_patterns=(
            "Relying on hidden React UI state for access control.",
            "Sending broad sensitive datasets through Inertia props.",
            "Skipping form request validation for filters, exports, uploads, or admin actions.",
            "Unbounded report queries or exports.",
        ),
        core_constraints=(
            "Use Laravel routes, controllers, requests, policies, middleware, and models as the server boundary.",
            "Use Inertia page contracts for React views.",
            "Treat reports and exports as controlled, auditable operations.",
        ),
        anti_patterns=(
            "Creating a separate SPA/API architecture without explicit approval.",
            "Duplicating authorization rules in React instead of enforcing them in Laravel.",
            "Returning sensitive props because the UI hides them.",
        ),
        expected_artifacts=(
            "Route, controller, request, policy, and Inertia page map.",
            "Data model and migration notes.",
            "Authorization matrix for roles and administrative actions.",
            "Inertia prop contract for sensitive pages.",
            "Export/report performance and access-control notes.",
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
