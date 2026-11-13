"""Tests for MAS stack-aware initialization."""

from __future__ import annotations

import json
import re
from pathlib import Path

from typer.testing import CliRunner

from specify_cli import app
from specify_cli.mas import (
    _bullets,
    get_mas_stack,
    language_policy_init_options,
    render_language_policy_md,
    valid_stack_ids,
)

_MAS_INIT_OPTS = [
    "--ignore-agent-tools",
    "--script",
    "sh",
    "--skip-external-skills",
    "--non-interactive",
]


def test_mas_stack_catalog_resolves_preset_composition():
    stack = get_mas_stack("moodle5-plugin")

    assert stack is not None
    assert stack.id == "moodle5-plugin"
    assert stack.display_name == "Moodle 5 Plugin"
    assert stack.stack_preset_id == "mas-stack-moodle5-plugin"
    assert stack.preset_composition == ("mas-core", "mas-stack-moodle5-plugin")
    assert stack.preset_install_plan == (
        ("mas-core", 10),
        ("mas-stack-moodle5-plugin", 5),
    )
    assert "moodle5-plugin" in valid_stack_ids()
    assert "moodle3" in valid_stack_ids()
    assert "nestjs-react" in valid_stack_ids()


def test_mas_stack_moodle3_is_exception_track():
    stack = get_mas_stack("moodle3")

    assert stack is not None
    assert stack.display_name == "Moodle 3.x (Legacy Exception)"
    assert stack.stack_preset_id == "mas-stack-moodle3"
    assert "not an approved company stack" in stack.security_profile


def test_init_with_valid_stack_persists_stack_metadata(tmp_path):
    project = tmp_path / "project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-plugin",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    payload = json.loads((project / ".specify" / "init-options.json").read_text())
    assert payload["stack"] == "moodle5-plugin"
    assert payload["stack_display_name"] == "Moodle 5 Plugin"
    assert payload["mas_presets"] == ["mas-core", "mas-stack-moodle5-plugin"]

    assert (project / ".specify" / "presets" / "mas-core" / "preset.yml").exists()
    assert (
        project
        / ".specify"
        / "presets"
        / "mas-stack-moodle5-plugin"
        / "preset.yml"
    ).exists()

    memory_dir = project / ".specify" / "memory"
    assert (memory_dir / "stack.md").exists()
    assert (memory_dir / "security-guidelines.md").exists()
    assert (memory_dir / "stack-context.md").exists()
    assert (memory_dir / "language-policy.md").exists()


def test_mas_language_policy_defaults():
    options = language_policy_init_options()
    assert options["artifact_language"] == "en"
    assert options["product_locale"] == "es-ES"

    policy = render_language_policy_md()
    assert "# MAS Language Policy" in policy
    assert "**Artifact Language**: `en`" in policy
    assert "**Product Locale**: `es-ES`" in policy
    assert "### 1. Conversation (match the user)" in policy
    assert "### 2. Persisted Artifacts (English only)" in policy
    assert "### 3. User-Facing Copy (product locale)" in policy


def test_init_persists_language_policy_init_options(tmp_path):
    project = tmp_path / "language-policy-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-plugin",
            "--ignore-agent-tools",
            "--script",
            "sh",
            "--skip-external-skills",
            "--non-interactive",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    payload = json.loads((project / ".specify" / "init-options.json").read_text())
    assert payload["artifact_language"] == "en"
    assert payload["product_locale"] == "es-ES"

    policy_md = (project / ".specify" / "memory" / "language-policy.md").read_text()
    assert "Three Language Zones" in policy_md
    assert "Moodle Language Strings" in policy_md


def test_mas_spec_template_includes_user_facing_copy_section(tmp_path):
    project = tmp_path / "spec-template-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-plugin",
            "--ignore-agent-tools",
            "--script",
            "sh",
            "--skip-external-skills",
            "--non-interactive",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    from specify_cli.presets import PresetResolver

    spec_template = PresetResolver(project).resolve_content("spec-template")
    assert spec_template is not None
    assert "## User-Facing Copy" in spec_template
    assert "Product Locale" in spec_template
    assert "Literal Text" in spec_template


def test_mas_plan_template_includes_language_strings_section(tmp_path):
    project = tmp_path / "language-plan-template-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-plugin",
            "--ignore-agent-tools",
            "--non-interactive",
            "--skip-external-skills",
            "--script",
            "sh",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    from specify_cli.presets import PresetResolver

    plan_template = PresetResolver(project).resolve_content("plan-template")
    assert plan_template is not None
    assert "## Language Strings & User-Facing Copy" in plan_template
    assert "Moodle Implementation Notes" in plan_template


def test_init_installs_mas_language_aware_core_commands(tmp_path):
    project = tmp_path / "language-commands-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-plugin",
            "--ignore-agent-tools",
            "--non-interactive",
            "--skip-external-skills",
            "--script",
            "sh",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    specify_skill = project / ".agents" / "skills" / "speckit-specify" / "SKILL.md"
    clarify_skill = project / ".agents" / "skills" / "speckit-clarify" / "SKILL.md"
    checklist_skill = project / ".agents" / "skills" / "speckit-checklist" / "SKILL.md"
    plan_skill = project / ".agents" / "skills" / "speckit-plan" / "SKILL.md"
    tasks_skill = project / ".agents" / "skills" / "speckit-tasks" / "SKILL.md"

    specify_content = specify_skill.read_text(encoding="utf-8")
    assert "MAS Language Policy Requirements" in specify_content
    assert ".specify/memory/language-policy.md" in specify_content
    assert "## User-Facing Copy" in specify_content

    clarify_content = clarify_skill.read_text(encoding="utf-8")
    assert "MAS Language Policy Requirements" in clarify_content

    checklist_content = checklist_skill.read_text(encoding="utf-8")
    assert "MAS Language Policy Checklist Requirements" in checklist_content
    assert "Language Policy" in checklist_content
    assert "product-locale strings" in checklist_content

    plan_content = plan_skill.read_text(encoding="utf-8")
    assert "Language Strings & User-Facing Copy" in plan_content

    tasks_content = tasks_skill.read_text(encoding="utf-8")
    assert "MAS Language Policy Requirements" in tasks_content


def test_init_with_valid_stack_uses_mas_constitution_source(tmp_path):
    project = tmp_path / "constitution-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "laravel-inertia-react",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    constitution = (
        project / ".specify" / "memory" / "constitution.md"
    ).read_text(encoding="utf-8")
    assert "# [PROJECT_NAME] Constitution" in constitution
    assert "### V. Unit Testing" in constitution
    assert "Every code modification MUST include unit tests" in constitution
    assert "Bug fixes MUST add a regression unit test" in constitution
    assert "Stack-Constrained Design" in constitution
    assert "specify init --stack <stack-id>" in constitution


def test_init_does_not_add_specify_to_root_gitignore(tmp_path):
    """Root .gitignore should NOT contain .specify/ — nested .specify/.gitignore handles it."""
    project = tmp_path / "gitignore-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "laravel-inertia-react",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output
    # Root .gitignore should NOT exist or NOT contain .specify/
    root_gitignore = project / ".gitignore"
    if root_gitignore.exists():
        content = root_gitignore.read_text(encoding="utf-8")
        assert ".specify/" not in content, "Root .gitignore should not ignore .specify/"


def test_init_preserves_existing_gitignore_without_adding_specify(tmp_path):
    """Existing .gitignore should be preserved, .specify/ NOT added."""
    project = tmp_path / "existing-gitignore-project"
    project.mkdir()
    (project / ".gitignore").write_text("node_modules/\ndist/", encoding="utf-8")

    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--force",
            "--integration",
            "codex",
            "--stack",
            "laravel-inertia-react",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output
    gitignore = (project / ".gitignore").read_text(encoding="utf-8")
    # Should preserve original content, NOT add .specify/
    assert "node_modules/" in gitignore
    assert "dist/" in gitignore
    assert ".specify/" not in gitignore, "Should not add .specify/ to root .gitignore"


def test_nested_specify_gitignore_ignores_local_state_only(tmp_path):
    """The nested .specify/.gitignore should ignore machine-local state, not memory/."""
    project = tmp_path / "nested-gitignore-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "laravel-inertia-react",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    nested_gitignore = project / ".specify" / ".gitignore"
    assert nested_gitignore.exists(), ".specify/.gitignore should exist"

    content = nested_gitignore.read_text(encoding="utf-8")
    # Should ignore machine-local state
    assert "feature.json" in content, "Should ignore feature.json (local state)"
    assert "integrations/packages/" in content, "Should ignore integrations/packages/"
    # Should NOT ignore memory/ (it's versioned)
    assert "memory/" not in content or "NOT ignored" in content


def test_specify_memory_and_templates_can_be_versioned(tmp_path):
    """memory/, templates/, and init-options.json should NOT be gitignored — verify with git check-ignore."""
    import subprocess

    project = tmp_path / "versioned-files-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "laravel-inertia-react",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    # Initialize git repo for check-ignore to work
    subprocess.run(["git", "init"], cwd=project, check=True, capture_output=True)

    # These files should NOT be ignored (exit code 1 = not ignored)
    files_to_check = [
        ".specify/memory/constitution.md",
        ".specify/memory/stack.md",
        ".specify/init-options.json",
    ]

    for rel_path in files_to_check:
        full_path = project / rel_path
        if full_path.exists():
            result = subprocess.run(
                ["git", "check-ignore", "-q", rel_path],
                cwd=project,
                capture_output=True,
            )
            # Exit code 1 means NOT ignored (what we want)
            # Exit code 0 means ignored (bad)
            assert result.returncode == 1, f"{rel_path} should NOT be gitignored but it is"

    # feature.json SHOULD be ignored (by nested .specify/.gitignore)
    feature_json = project / ".specify" / "feature.json"
    feature_json.write_text("{}", encoding="utf-8")  # Create it for test
    result = subprocess.run(
        ["git", "check-ignore", "-q", ".specify/feature.json"],
        cwd=project,
        capture_output=True,
    )
    # Exit code 0 means ignored (what we want for feature.json)
    assert result.returncode == 0, "feature.json should be gitignored by nested .gitignore"


def test_init_with_valid_stack_writes_selected_stack_memory(tmp_path):
    project = tmp_path / "memory-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "laravel-inertia-react",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    memory_dir = project / ".specify" / "memory"
    stack_md = (memory_dir / "stack.md").read_text()
    security_md = (memory_dir / "security-guidelines.md").read_text()
    context_md = (memory_dir / "stack-context.md").read_text()

    assert "**Canonical ID**: `laravel-inertia-react`" in stack_md
    assert "**Display Name**: Laravel + Inertia + React" in stack_md
    assert "## Purpose" in stack_md
    assert "Laravel is the application boundary" in stack_md
    assert "Moodle 5 Plugin" not in stack_md

    assert "**Stack ID**: `laravel-inertia-react`" in security_md
    assert "## Security Controls" in security_md
    assert "## Security Evidence" in security_md
    assert "FormRequest" in security_md
    assert "React UI must never be the source of authorization truth" in security_md
    assert "[Short risk profile.]" not in security_md

    assert "# Stack Context: Laravel + Inertia + React" in context_md
    assert "## Typical Risks" in context_md
    assert "## Preferred Practices" in context_md
    assert "Laravel routes, controllers, form requests" in context_md
    assert "spatie/laravel-permission" in context_md
    assert "[Constraint.]" not in context_md


def test_init_installs_mas_stack_aware_plan_command(tmp_path):
    project = tmp_path / "plan-command-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-plugin",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    plan_skill = project / ".agents" / "skills" / "speckit-plan" / "SKILL.md"
    content = plan_skill.read_text()
    assert "MAS Stack-Aware Planning Requirements" in content
    assert ".specify/memory/stack.md" in content
    assert ".specify/memory/security-guidelines.md" in content
    assert ".specify/memory/stack-context.md" in content
    assert "return `HARD_FAIL` and stop planning" in content
    assert "The stack in `.specify/memory/stack.md` is fixed project context" in content
    assert "Planning must validate against that stack" in content


def test_mas_plan_template_contains_stack_validation_structure(tmp_path):
    project = tmp_path / "plan-template-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "cakephp2-mysql",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    from specify_cli.presets import PresetResolver

    plan_template = PresetResolver(project).resolve_content("plan-template")
    assert plan_template is not None
    assert "## MAS Stack Validation" in plan_template
    assert "**Selected Stack**" in plan_template
    assert "### Stack Alignment" in plan_template
    assert "### Stack Constraints" in plan_template
    assert "### Security Guideline Alignment" in plan_template
    assert "### Expected Artifact Coverage" in plan_template
    assert "### Compatibility And Anti-Patterns" in plan_template
    assert "### Deviations" in plan_template
    assert "PASS" in plan_template
    assert "WARNING" in plan_template
    assert "DEVIATION_REQUIRED" in plan_template
    assert "HARD_FAIL" in plan_template
    assert "selected during initialization" in plan_template


def test_init_installs_mas_stack_aware_tasks_command(tmp_path):
    project = tmp_path / "tasks-command-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-portal",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    tasks_skill = project / ".agents" / "skills" / "speckit-tasks" / "SKILL.md"
    content = tasks_skill.read_text(encoding="utf-8")
    assert "MAS Stack-Aware Task Generation Requirements" in content
    assert ".specify/memory/constitution.md" in content
    assert ".specify/memory/stack.md" in content
    assert ".specify/memory/security-guidelines.md" in content
    assert ".specify/memory/stack-context.md" in content
    assert "MAS Stack Validation" in content
    assert "For MAS-initialized projects, the stack is fixed project context" in content
    assert "`PASS`" in content
    assert "`WARNING`" in content
    assert "`DEVIATION_REQUIRED`" in content
    assert "`HARD_FAIL`" in content
    assert "stop normal task generation" in content
    assert "permissions, roles, visibility boundaries" in content
    assert "expected stack artifacts" in content


def test_mas_tasks_template_preserves_story_structure_and_validation_guidance(tmp_path):
    project = tmp_path / "tasks-template-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "cakephp2-mysql",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    from specify_cli.presets import PresetResolver

    tasks_template = PresetResolver(project).resolve_content("tasks-template")
    assert tasks_template is not None
    assert "## MAS Task Inputs" in tasks_template
    assert ".specify/memory/constitution.md" in tasks_template
    assert ".specify/memory/stack.md" in tasks_template
    assert ".specify/memory/security-guidelines.md" in tasks_template
    assert ".specify/memory/stack-context.md" in tasks_template
    assert "MAS Stack Validation" in tasks_template
    assert "`PASS`" in tasks_template
    assert "`WARNING`" in tasks_template
    assert "`DEVIATION_REQUIRED`" in tasks_template
    assert "`HARD_FAIL`" in tasks_template
    assert "Stop normal implementation task generation" in tasks_template
    assert "permissions, roles, visibility" in tasks_template
    assert "expected stack artifacts" in tasks_template
    assert "## Phase 1: Setup" in tasks_template
    assert "## Phase 2: Foundational" in tasks_template
    assert "## Phase 3: User Story 1" in tasks_template
    assert "## Dependencies & Execution Order" in tasks_template
    assert "## Implementation Strategy" in tasks_template
    assert "## Format: `[ID] [P?] [Story] Description`" in tasks_template


def test_init_rejects_missing_stack_before_side_effects(tmp_path):
    project = tmp_path / "missing-stack"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--ignore-agent-tools",
            "--non-interactive",
            "--skip-external-skills",
            "--script",
            "sh",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 1
    assert "MAS initialization requires an approved stack" in result.output
    assert "cakephp2-mysql" in result.output
    assert "moodle3" in result.output
    assert "specify init . --integration codex --stack moodle5-plugin" in result.output
    assert not project.exists()


def test_init_with_moodle3_stack_writes_exception_track_memory(tmp_path):
    project = tmp_path / "moodle3-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle3",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    memory_dir = project / ".specify" / "memory"
    stack_md = (memory_dir / "stack.md").read_text()
    security_md = (memory_dir / "security-guidelines.md").read_text()

    assert "**Canonical ID**: `moodle3`" in stack_md
    assert "Legacy Exception" in stack_md
    assert "Deviation / Exception Needed" in stack_md
    assert "## Security Controls" in security_md
    assert "migration to Moodle 5" in security_md
    assert (project / ".specify" / "presets" / "mas-stack-moodle3" / "preset.yml").exists()


def test_init_rejects_invalid_stack_before_side_effects(tmp_path):
    project = tmp_path / "invalid-stack"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "Moodle5-Plugin",
            "--ignore-agent-tools",
            "--non-interactive",
            "--skip-external-skills",
            "--script",
            "sh",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 1
    assert "Invalid --stack value 'Moodle5-Plugin'" in result.output
    assert "moodle5-plugin" in result.output
    assert "specify init . --integration codex --stack moodle5-plugin" in result.output
    assert not project.exists()


def test_init_rejects_stack_and_preset_conflict(tmp_path):
    project = tmp_path / "stack-preset-conflict"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-plugin",
            "--preset",
            "lean",
            "--ignore-agent-tools",
            "--non-interactive",
            "--skip-external-skills",
            "--script",
            "sh",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 1
    assert "--stack and --preset are mutually exclusive" in result.output
    assert "mas-core" in result.output
    assert "mas-stack-<stack-id>" in result.output
    assert not project.exists()


def test_mas_stack_nestjs_react_metadata():
    stack = get_mas_stack("nestjs-react")

    assert stack is not None
    assert stack.id == "nestjs-react"
    assert stack.display_name == "NestJS + React (API + SPA)"
    assert stack.stack_preset_id == "mas-stack-nestjs-react"
    assert stack.preset_composition == ("mas-core", "mas-stack-nestjs-react")
    assert "Prisma" in stack.summary
    assert "monorepo" in stack.purpose.lower()


def test_init_with_nestjs_react_stack_writes_memory_files(tmp_path):
    project = tmp_path / "nestjs-react-project"
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "nestjs-react",
            *_MAS_INIT_OPTS,
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output

    payload = json.loads((project / ".specify" / "init-options.json").read_text())
    assert payload["stack"] == "nestjs-react"
    assert payload["stack_display_name"] == "NestJS + React (API + SPA)"
    assert payload["mas_presets"] == ["mas-core", "mas-stack-nestjs-react"]

    assert (project / ".specify" / "presets" / "mas-core" / "preset.yml").exists()
    assert (
        project / ".specify" / "presets" / "mas-stack-nestjs-react" / "preset.yml"
    ).exists()

    memory_dir = project / ".specify" / "memory"
    assert (memory_dir / "stack.md").exists()
    assert (memory_dir / "security-guidelines.md").exists()
    assert (memory_dir / "stack-context.md").exists()
    assert (memory_dir / "language-policy.md").exists()

    stack_md = (memory_dir / "stack.md").read_text()
    security_md = (memory_dir / "security-guidelines.md").read_text()
    context_md = (memory_dir / "stack-context.md").read_text()

    assert "**Canonical ID**: `nestjs-react`" in stack_md
    assert "**Display Name**: NestJS + React (API + SPA)" in stack_md
    assert "apps/api" in stack_md
    assert "apps/web" in stack_md
    assert "Prisma" in stack_md

    assert "**Stack ID**: `nestjs-react`" in security_md
    assert "HttpOnly" in security_md
    assert "CSRF" in security_md
    assert "AuthGuard" in security_md
    assert "$queryRawUnsafe" in security_md

    assert "# Stack Context: NestJS + React (API + SPA)" in context_md
    assert "Monorepo" in context_md
    assert "Prisma" in context_md
    assert "OpenAPI" in context_md


def test_nestjs_react_stack_contrasts_with_laravel():
    nestjs_stack = get_mas_stack("nestjs-react")
    laravel_stack = get_mas_stack("laravel-inertia-react")

    assert nestjs_stack is not None
    assert laravel_stack is not None

    nestjs_constraints = " ".join(nestjs_stack.core_constraints)
    assert "Laravel + Inertia" in nestjs_constraints or "Inertia" in nestjs_constraints
    assert "decoupled" in nestjs_constraints.lower() or "monorepo" in nestjs_constraints.lower()

    nestjs_when_not = " ".join(nestjs_stack.when_not_to_use)
    assert "Laravel" in nestjs_when_not or "Inertia" in nestjs_when_not


def test_bullets_renders_headings_and_items():
    """Test that _bullets handles ## and ### prefixes as Markdown headings."""
    items = (
        "Regular item one",
        "## Section Heading",
        "Regular item two",
        "### Subsection Heading",
        "Regular item three",
    )
    result = _bullets(items)

    assert "- Regular item one" in result
    assert "\n### Section Heading" in result
    assert "- Regular item two" in result
    assert "\n#### Subsection Heading" in result
    assert "- Regular item three" in result
    assert "- ## Section Heading" not in result
    assert "- ### Subsection Heading" not in result


def test_nestjs_react_uses_es_cl_locale():
    """Test that nestjs-react stack uses es-CL as default product locale with Chile label."""
    from specify_cli.mas import render_language_policy_md

    stack = get_mas_stack("nestjs-react")
    assert stack is not None
    assert stack.default_product_locale == "es-CL"

    # Check init_options_payload includes es-CL
    payload = stack.init_options_payload()
    assert payload["product_locale"] == "es-CL"

    # Check render_language_policy_md with es-CL shows Spanish — Chile
    policy_md = render_language_policy_md(product_locale="es-CL")
    assert "es-CL" in policy_md
    assert "Spanish — Chile" in policy_md
    assert "Spanish — Spain" not in policy_md


def test_other_stacks_unchanged_locale():
    """Test that other stacks don't have a default_product_locale override and use Spanish — Spain."""
    for stack_id in ["cakephp2-mysql", "moodle3", "moodle5-plugin", "moodle5-portal", "laravel-inertia-react"]:
        stack = get_mas_stack(stack_id)
        assert stack is not None
        assert stack.default_product_locale is None, f"{stack_id} should not have default_product_locale"
        payload = stack.init_options_payload()
        assert payload["product_locale"] == "es-ES", f"{stack_id} should use es-ES"
        # Verify language-policy.md shows Spanish — Spain
        policy_md = render_language_policy_md(product_locale="es-ES")
        assert "Spanish — Spain" in policy_md
        assert "Spanish — Chile" not in policy_md


def test_bullets_renders_nested_items():
    """Test that _bullets handles nested items ('  - ') correctly."""
    items = (
        "Top level item",
        "  - Nested item one",
        "  - Nested item two",
        "Another top level",
    )
    result = _bullets(items)
    assert "- Top level item" in result
    assert "  - Nested item one" in result
    assert "  - Nested item two" in result
    assert "- Another top level" in result
    assert "-   - Nested" not in result


def test_bullets_no_triple_blank_lines():
    """Test that _bullets avoids triple blank lines between sections."""
    items = (
        "## Section One",
        "Item in section one",
        "## Section Two",
        "Item in section two",
    )
    result = _bullets(items)
    assert "\n\n\n" not in result


_REPO_ROOT = Path(__file__).resolve().parent.parent

# Banned in every context, including "do not use" lines.
_NEVER_MENTION = re.compile(
    r"opentelemetry|\botel\b|z\.string\(\)\.uuid\(\)|McpTestClient", re.IGNORECASE
)
# Allowed only on lines that explicitly prohibit them.
_PROHIBITION_ONLY = ("@nestjs/authorization", "class-validator", "cache-manager")
_PROHIBITION_LINE = re.compile(
    r"\b(?:do not|don't|never|forbidden|prohibited|reject|instead of)\b|\bNOT\b|\bNO\b|❌",
    re.IGNORECASE,
)


def _forbidden_term_violations(name: str, text: str) -> list[str]:
    violations = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        if _NEVER_MENTION.search(line):
            violations.append(f"{name}:{lineno}: {line.strip()[:120]}")
            continue
        if any(term in line for term in _PROHIBITION_ONLY) and not _PROHIBITION_LINE.search(line):
            violations.append(f"{name}:{lineno}: {line.strip()[:120]}")
    return violations


def test_forbidden_term_checker_flags_and_allows_expected_lines():
    assert _forbidden_term_violations("x", "Use OpenTelemetry for traces.")
    assert _forbidden_term_violations("x", "Do NOT use OTel exporters.")
    assert _forbidden_term_violations("x", "Install @opentelemetry/api")
    assert _forbidden_term_violations("x", "id: z.string().uuid()")
    assert _forbidden_term_violations("x", "Use `@nestjs/authorization` guards.")
    assert _forbidden_term_violations("x", "Validate DTOs with class-validator.")
    assert not _forbidden_term_violations("x", "Do NOT use `@nestjs/authorization`.")
    assert not _forbidden_term_violations("x", "Zod only (NO class-validator)")
    assert not _forbidden_term_violations("x", "Hotel booking; id: z.uuid()")


def test_mas_docs_have_no_forbidden_terms():
    docs = sorted((_REPO_ROOT / "docs" / "mas").glob("*.md"))
    preset_docs = sorted((_REPO_ROOT / "presets" / "mas-stack-nestjs-react").rglob("*.md"))
    assert docs and preset_docs
    violations = []
    for path in docs + preset_docs:
        rel = path.relative_to(_REPO_ROOT).as_posix()
        violations += _forbidden_term_violations(rel, path.read_text(encoding="utf-8"))
    assert not violations, "\n".join(violations)


def test_nestjs_react_generated_memory_has_no_forbidden_terms(tmp_path):
    project = tmp_path / "nestjs-react-forbidden"
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "codex", "--stack", "nestjs-react", *_MAS_INIT_OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output

    memory_files = sorted((project / ".specify" / "memory").glob("*.md"))
    assert {p.name for p in memory_files} >= {"stack.md", "security-guidelines.md", "stack-context.md"}
    violations = []
    for path in memory_files:
        violations += _forbidden_term_violations(path.name, path.read_text(encoding="utf-8"))
    assert not violations, "\n".join(violations)


def test_nestjs_react_requires_tailwind_source_directive(tmp_path):
    """Test that nestjs-react stack docs require @source directive for Tailwind 4 monorepo."""
    project = tmp_path / "tailwind-source"
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "codex", "--stack", "nestjs-react", *_MAS_INIT_OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output

    # Check constitution requires @source
    constitution = (project / ".specify" / "memory" / "constitution.md").read_text(encoding="utf-8")
    assert "@source" in constitution, "Constitution must require @source directive"
    assert "packages/ui" in constitution, "Constitution must reference packages/ui for @source"

    # Check stack-context.md documents the @source configuration (detailed stack docs)
    stack_context = (project / ".specify" / "memory" / "stack-context.md").read_text(encoding="utf-8")
    assert "@source" in stack_context, "stack-context.md must document @source directive"
    assert "Tailwind 4" in stack_context, "stack-context.md must mention Tailwind 4"

    # Check Playwright style verification is documented
    assert "computed" in stack_context.lower() or "getComputedStyle" in stack_context, \
        "stack-context.md must require Playwright style verification"


_AD_HOC_SCREENSHOT_RULE = (
    "AI agents MUST NOT take, generate, or save ad hoc screenshots during "
    "`/speckit.implement`, demos, or pilots—not with Playwright, not with a "
    "browser, and not with scripts. Visual review is performed by a human "
    "(revisión visual humana). Playwright + axe-core gates, including computed "
    "Tailwind style verification, remain mandatory and MUST run without "
    "screenshots (`screenshot: 'off'`; no `toHaveScreenshot()`; no "
    "`page.screenshot()`)."
)


def test_nestjs_react_constitution_forbids_ad_hoc_agent_screenshots(tmp_path):
    """Generated nestjs-react constitution forbids ad hoc AI screenshots.

    Playwright + axe gates, including computed Tailwind style checks, stay
    mandatory and still run with screenshots disabled.
    """
    project = tmp_path / "no-ad-hoc-screenshots"
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "codex", "--stack", "nestjs-react", *_MAS_INIT_OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output

    constitution = (project / ".specify" / "memory" / "constitution.md").read_text(encoding="utf-8")
    assert _AD_HOC_SCREENSHOT_RULE in constitution
    assert "At least one Playwright spec MUST verify computed styles" in constitution

    stack_context = (project / ".specify" / "memory" / "stack-context.md").read_text(encoding="utf-8")
    security = (project / ".specify" / "memory" / "security-guidelines.md").read_text(encoding="utf-8")
    assert _AD_HOC_SCREENSHOT_RULE in stack_context
    assert _AD_HOC_SCREENSHOT_RULE in security

    laravel = get_mas_stack("laravel-inertia-react")
    assert laravel is not None
    laravel_rules = "\n".join(
        laravel.security_controls
        + laravel.anti_patterns
        + laravel.expected_artifacts
        + laravel.plan_validation_checks
    )
    assert "ad hoc screenshots" not in laravel_rules


def test_nestjs_react_prisma_esm_config_and_no_import_fixing_scripts(tmp_path):
    """Test that nestjs-react stack requires correct Prisma ESM config and prohibits import-fixing scripts."""
    project = tmp_path / "prisma-esm"
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "codex", "--stack", "nestjs-react", *_MAS_INIT_OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output

    stack_context = (project / ".specify" / "memory" / "stack-context.md").read_text(encoding="utf-8")

    # Check Prisma generator config requirements
    assert "importFileExtension" in stack_context, "stack-context.md must require importFileExtension in Prisma generator"
    assert 'moduleFormat = "esm"' in stack_context or "moduleFormat" in stack_context, \
        "stack-context.md must require moduleFormat esm"
    assert 'provider = "prisma-client"' in stack_context or "prisma-client" in stack_context, \
        "stack-context.md must require prisma-client provider"

    # Check prohibition of import-fixing scripts
    assert "fix" in stack_context.lower() and "import" in stack_context.lower(), \
        "stack-context.md must mention prohibition of import-fixing scripts"
    assert "PROHIBITED" in stack_context or "prohibited" in stack_context.lower(), \
        "stack-context.md must explicitly prohibit import-fixing scripts"

    # Check dev script requirements
    assert "nest start --watch" in stack_context, "stack-context.md must require nest start --watch for dev"
    assert "nest build" in stack_context, "stack-context.md must document nest build"


def test_nestjs_react_closes_demo2_framework_gaps(tmp_path):
    """Demo 2 gaps that must show up in generated NestJS memory and commands."""
    project = tmp_path / "demo2-gaps"
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "codex", "--stack", "nestjs-react", *_MAS_INIT_OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output

    context = (project / ".specify" / "memory" / "stack-context.md").read_text(encoding="utf-8")
    constitution = (project / ".specify" / "memory" / "constitution.md").read_text(encoding="utf-8")
    tasks_skill = (project / ".agents" / "skills" / "speckit-tasks" / "SKILL.md").read_text(encoding="utf-8")
    plan_skill = (project / ".agents" / "skills" / "speckit-plan" / "SKILL.md").read_text(encoding="utf-8")
    analyze_skill = (project / ".agents" / "skills" / "speckit-analyze" / "SKILL.md").read_text(encoding="utf-8")

    assert "apps/api/prisma.config.ts" in context
    assert "schema: 'prisma/schema.prisma'" in context
    assert "npm view" in context
    assert "typescript-eslint" in context
    assert "Mandatory Auth Phase" in context
    assert "SkipCsrf()" in context
    assert "insufficient_scope" in context
    assert "isError: true" in context
    assert "allowBuilds" in context
    assert "approve-builds --all" in context
    assert "migrate reset" in context
    assert "node --import tsx" in context
    assert "createPrismaAbility" in context
    assert ".ofType(" in context
    assert "@casl/prisma/runtime" in context
    assert "queryClient.query" in context
    assert "createMongoAbility" not in context
    assert "MongoAbility" not in context
    assert "onUnhandledFrame" in context
    assert "getAnimations()" in context
    assert "richColors" in context
    assert "@theme inline" in context
    assert "routeTree.gen.ts" in context and "Do not list it in `.gitignore`" in context
    assert "dist/generated/prisma/client.js" in context
    assert "tsconfig.build.json" in context
    assert "projectService" in context
    assert "escapeLike" in context
    assert "LOGIN_THROTTLE_LIMIT" in context
    assert "getZodError()" in context
    assert "source-only" in context
    assert "radix-ui" in context

    assert "AuthModule" in constitution
    assert "queryClient.query" in constitution
    assert "SkipCsrf()" in constitution

    assert "blocking auth phase" in tasks_skill
    assert "check-casl.ts" in tasks_skill
    assert "allowBuilds" in tasks_skill
    assert "queryClient.query" in tasks_skill

    assert "@demo/api" in plan_skill
    assert "es-CL" in plan_skill

    assert "CRITICAL" in analyze_skill
    assert "AuthModule" in analyze_skill
    assert "insufficient" not in analyze_skill or "routeTree" in analyze_skill


def test_nestjs_react_pins_active_lts_from_nodejs_index(tmp_path):
    """Node is the Active LTS from index.json; a missing .nvmrc is CRITICAL."""
    project = tmp_path / "node-lts"
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "codex", "--stack", "nestjs-react", *_MAS_INIT_OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output

    context = (project / ".specify" / "memory" / "stack-context.md").read_text(encoding="utf-8")
    constitution = (project / ".specify" / "memory" / "constitution.md").read_text(encoding="utf-8")
    analyze_skill = (project / ".agents" / "skills" / "speckit-analyze" / "SKILL.md").read_text(encoding="utf-8")
    tasks_skill = (project / ".agents" / "skills" / "speckit-tasks" / "SKILL.md").read_text(encoding="utf-8")

    assert "https://nodejs.org/dist/index.json" in context
    assert "first" in context and "lts" in context
    assert ".nvmrc" in context
    assert "npm i -g corepack@latest && corepack enable" in context
    assert "node:22" not in context
    assert "26.13.1" in context
    assert "not a hardcoded `26`" in context

    assert "index.json" in constitution
    assert ".nvmrc" in constitution
    assert "corepack@latest" in constitution

    assert "CRITICAL" in analyze_skill
    assert ".nvmrc" in analyze_skill
    assert "not a warning" in analyze_skill
    assert "index.json" in analyze_skill
    assert "26.13.1" in tasks_skill
    assert "corepack@latest" in tasks_skill


def test_init_force_explains_git_merge(tmp_path, monkeypatch):
    project = tmp_path / "with-git"
    project.mkdir()
    subprocess_mod = __import__("subprocess")
    subprocess_mod.run(["git", "init"], cwd=project, check=True, capture_output=True)
    monkeypatch.chdir(project)
    result = CliRunner().invoke(
        app,
        ["init", ".", "--force", "--integration", "codex", "--stack", "nestjs-react", *_MAS_INIT_OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output
    assert ".git" in result.output
    assert "Does not rewrite .git" in result.output
    assert "Overwrite" in result.output or "Overwrites" in result.output


def test_mas_constitution_keeps_security_standard_inside_principle_one():
    template = Path(__file__).resolve().parents[1] / "presets/mas-core/templates/constitution-template.md"
    content = template.read_text(encoding="utf-8")
    headings = [line for line in content.splitlines() if line.startswith("#")]
    assert [line for line in headings if line.startswith("# ")] == ["# [PROJECT_NAME] Constitution"]
    security = content.split("### I. Security and Access Control", 1)[1].split("### II.", 1)[0]
    assert "#### Security Standard (Stack-Agnostic)" in security
    assert "##### 1. Authentication and Identity Lifecycle" in security
    assert "Deny by default" in security
