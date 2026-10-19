"""Tests for MAS stack-aware initialization."""

from __future__ import annotations

import json

from typer.testing import CliRunner

from specify_cli import app
from specify_cli.mas import (
    get_mas_stack,
    language_policy_init_options,
    render_language_policy_md,
    valid_stack_ids,
)

_MAS_INIT_OPTS = [
    "--ignore-agent-tools",
    "--non-interactive",
    "--script",
    "sh",
    "--skip-external-skills",
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
            "--non-interactive",
            "--script",
            "sh",
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
            "--non-interactive",
            "--script",
            "sh",
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


def test_init_uses_managed_specify_gitignore(tmp_path):
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
    managed = (project / ".specify" / ".gitignore").read_text(encoding="utf-8")
    assert "feature.json" in managed
    root_gitignore = project / ".gitignore"
    if root_gitignore.exists():
        assert ".specify/" not in root_gitignore.read_text(encoding="utf-8").splitlines()


def test_init_preserves_existing_root_gitignore(tmp_path):
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
    assert (project / ".gitignore").read_text(encoding="utf-8") == "node_modules/\ndist/"
    assert "feature.json" in (project / ".specify" / ".gitignore").read_text(encoding="utf-8")


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


def test_init_rejects_missing_stack_before_side_effects(tmp_path, monkeypatch):
    import specify_cli.mas_init as mas_init

    monkeypatch.delenv("SPECIFY_ALLOW_STACKLESS", raising=False)
    monkeypatch.setattr(mas_init, "ALLOW_STACKLESS", False)
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


def test_init_installs_mas_language_aware_converge_command(tmp_path):
    project = tmp_path / "converge-command-project"
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
    content = (project / ".agents" / "skills" / "speckit-converge" / "SKILL.md").read_text()
    assert "MAS Language Policy Requirements" in content
    assert "tasks.md" in content
    assert "product_locale" in content
