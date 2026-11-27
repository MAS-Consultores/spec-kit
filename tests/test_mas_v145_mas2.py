"""Regressions for v1.4.5-mas.2 (D25)."""

from __future__ import annotations

import json
from pathlib import Path

import yaml
from typer.testing import CliRunner

from specify_cli import app

REPO = Path(__file__).resolve().parents[1]
CORE_IMPLEMENT = REPO / "presets/mas-core/commands/speckit.implement.md"
NEST_IMPLEMENT = REPO / "presets/mas-stack-nestjs-react/commands/speckit.implement.md"
_INIT = [
    "--ignore-agent-tools",
    "--script",
    "sh",
    "--skip-external-skills",
    "--non-interactive",
]


def _invoke(args: list[str]):
    return CliRunner().invoke(app, args, catch_exceptions=False)


def test_d25_01_reinit_reuses_installed_integration(tmp_path: Path) -> None:
    """Non-interactive init without --integration keeps cursor-agent."""
    project = tmp_path / "app"
    first = _invoke(
        [
            "init",
            str(project),
            "--integration",
            "cursor-agent",
            "--stack",
            "nestjs-react",
            *_INIT,
        ]
    )
    assert first.exit_code == 0, first.output
    assert (project / ".specify/integrations/cursor-agent.manifest.json").is_file()

    import os

    previous = os.getcwd()
    os.chdir(project)
    try:
        again = _invoke(
            ["init", "--here", "--force", "--stack", "nestjs-react", *_INIT]
        )
    finally:
        os.chdir(previous)
    assert again.exit_code == 0, again.output
    assert "copilot" not in again.output.lower() or "reusing installed integration 'cursor-agent'" in again.output.lower()
    data = json.loads((project / ".specify/integration.json").read_text(encoding="utf-8"))
    assert data["integration"] == "cursor-agent"
    assert not (project / ".specify/integrations/copilot.manifest.json").exists()
    assert (project / ".github/skills").exists() is False or not any(
        (project / ".github/skills").glob("**/SKILL.md")
    )


def test_d25_01_empty_project_still_defaults(tmp_path: Path) -> None:
    project = tmp_path / "fresh"
    result = _invoke(
        ["init", str(project), "--stack", "cakephp2-mysql", *_INIT]
    )
    assert result.exit_code == 0, result.output
    data = json.loads((project / ".specify/integration.json").read_text(encoding="utf-8"))
    assert data["integration"] == "copilot"


def test_d25_01_ambiguous_integrations_do_not_pick_copilot(tmp_path: Path) -> None:
    project = tmp_path / "both"
    first = _invoke(
        [
            "init",
            str(project),
            "--integration",
            "cursor-agent",
            "--stack",
            "cakephp2-mysql",
            *_INIT,
        ]
    )
    assert first.exit_code == 0, first.output
    integ = project / ".specify" / "integrations"
    (integ / "copilot.manifest.json").write_text("{}\n", encoding="utf-8")
    state_path = project / ".specify" / "integration.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state.pop("integration", None)
    state.pop("default_integration", None)
    state["installed_integrations"] = ["cursor-agent", "copilot"]
    state_path.write_text(json.dumps(state), encoding="utf-8")
    options = json.loads((project / ".specify/init-options.json").read_text(encoding="utf-8"))
    options.pop("integration", None)
    options.pop("ai", None)
    (project / ".specify/init-options.json").write_text(json.dumps(options), encoding="utf-8")

    import os

    previous = os.getcwd()
    os.chdir(project)
    try:
        again = _invoke(["init", "--here", "--force", "--stack", "cakephp2-mysql", *_INIT])
    finally:
        os.chdir(previous)
    assert again.exit_code != 0
    lowered = again.output.lower()
    assert "cursor-agent" in lowered
    assert "copilot" in lowered
    assert "defaulting to 'copilot'" not in lowered


def test_d25_02_equal_priority_keeps_stack_composed(tmp_path: Path) -> None:
    """core and stack both at priority 5 still compose the stack on top."""
    project = tmp_path / "nest"
    result = _invoke(
        [
            "init",
            str(project),
            "--integration",
            "cursor-agent",
            "--stack",
            "nestjs-react",
            *_INIT,
        ]
    )
    assert result.exit_code == 0, result.output
    core = REPO / "presets" / "mas-core"
    stack = REPO / "presets" / "mas-stack-nestjs-react"
    import os

    previous = os.getcwd()
    os.chdir(project)
    try:
        for preset_id, path in (("mas-core", core), ("mas-stack-nestjs-react", stack)):
            updated = _invoke(
                ["preset", "update", preset_id, "--dev", str(path), "--priority", "5"]
            )
            assert updated.exit_code == 0, updated.output
    finally:
        os.chdir(previous)

    composed = project / ".specify/presets/mas-stack-nestjs-react/.composed"
    required = [
        "speckit.implement.md",
        "speckit.plan.md",
        "speckit.specify.md",
        "speckit.tasks.md",
        "speckit.analyze.md",
    ]
    names = {path.name for path in composed.glob("*.md")} if composed.is_dir() else set()
    missing = [name for name in required if name not in names]
    assert not missing, names
    implement = (composed / "speckit.implement.md").read_text(encoding="utf-8")
    assert "NestJS + React completion gate" in implement
    assert "{CORE_TEMPLATE}" not in implement
    skill = (project / ".cursor/skills/speckit-implement/SKILL.md").read_text(encoding="utf-8")
    assert "NestJS + React completion gate" in skill
    from specify_cli.presets import PresetManager

    order = [pack_id for pack_id, _meta in PresetManager(project).registry.list_by_priority()]
    assert order.index("mas-stack-nestjs-react") < order.index("mas-core")


def test_d25_03_reinit_preserves_hygiene_overrides(tmp_path: Path) -> None:
    project = tmp_path / "hygiene"
    result = _invoke(
        [
            "init",
            str(project),
            "--integration",
            "none",
            "--stack",
            "nestjs-react",
            *_INIT,
        ]
    )
    assert result.exit_code == 0, result.output
    path = project / ".specify" / "hygiene.yml"
    loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    loaded["debug_leftovers_exclude"] = ["src/legacy.ts"]
    loaded["h4_mode"] = "warn"
    loaded["size_excludes"] = list(loaded["size_excludes"]) + ["local/scratch/"]
    loaded["team_note"] = "keep-me"
    path.write_text(yaml.safe_dump(loaded, sort_keys=False), encoding="utf-8")

    import os

    previous = os.getcwd()
    os.chdir(project)
    try:
        again = _invoke(
            ["init", "--here", "--force", "--integration", "none", "--stack", "nestjs-react", *_INIT]
        )
    finally:
        os.chdir(previous)
    assert again.exit_code == 0, again.output
    merged = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert "src/legacy.ts" in merged["debug_leftovers_exclude"]
    assert merged["h4_mode"] == "warn"
    assert "local/scratch/" in merged["size_excludes"]
    assert "vendor/" in merged["size_excludes"] or "node_modules/" in merged["size_excludes"]
    assert merged["own_code_block"] == 1500
    assert merged["team_note"] == "keep-me"


def test_d25_05_stack_change_resets_stack_hygiene(tmp_path: Path) -> None:
    """Switching stacks replaces stack-owned hygiene and keeps user excludes."""
    import os

    project = tmp_path / "switch"
    first = _invoke(
        ["init", str(project), "--integration", "none", "--stack", "nestjs-react", *_INIT]
    )
    assert first.exit_code == 0, first.output
    path = project / ".specify" / "hygiene.yml"
    loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    loaded["debug_leftovers_exclude"] = ["src/legacy.ts"]
    path.write_text(yaml.safe_dump(loaded, sort_keys=False), encoding="utf-8")
    previous = os.getcwd()
    os.chdir(project)
    try:
        again = _invoke(
            [
                "init",
                "--here",
                "--force",
                "--integration",
                "none",
                "--stack",
                "cakephp2-mysql",
                *_INIT,
            ]
        )
    finally:
        os.chdir(previous)
    assert again.exit_code == 0, again.output
    merged = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert merged["entrypoint_kind"] == "cake"
    assert merged["production_branch"] == "master"
    assert merged["clean_code_mode"] == "info"
    assert "*Test.php" in merged["test_globs"]
    assert "*.spec.ts" not in merged["test_globs"]
    assert "src/legacy.ts" in merged["debug_leftovers_exclude"]


def test_d25_06_github_dir_is_not_copilot_and_menu_on_tty(tmp_path: Path, monkeypatch) -> None:
    """`.github/` alone is not Copilot. Interactive ambiguity opens the menu."""
    import os

    import specify_cli.command_init as init_mod

    project = tmp_path / "cursor"
    first = _invoke(
        ["init", str(project), "--integration", "cursor-agent", "--stack", "moodle3", *_INIT]
    )
    assert first.exit_code == 0, first.output
    assert (project / ".github").is_dir()
    state_path = project / ".specify" / "integration.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state.pop("integration", None)
    state.pop("default_integration", None)
    state["installed_integrations"] = ["cursor-agent"]
    state_path.write_text(json.dumps(state), encoding="utf-8")
    options = json.loads((project / ".specify/init-options.json").read_text(encoding="utf-8"))
    options.pop("integration", None)
    options.pop("ai", None)
    (project / ".specify/init-options.json").write_text(json.dumps(options), encoding="utf-8")

    previous = os.getcwd()
    os.chdir(project)
    try:
        again = _invoke(["init", "--here", "--force", "--stack", "moodle3", *_INIT])
    finally:
        os.chdir(previous)
    assert again.exit_code == 0, again.output
    data = json.loads(state_path.read_text(encoding="utf-8"))
    assert data["integration"] == "cursor-agent"
    assert "reusing installed integration 'copilot'" not in again.output.lower()

    bare = tmp_path / "workflows"
    (bare / ".github" / "workflows").mkdir(parents=True)
    (bare / ".github" / "workflows" / "ci.yml").write_text("name: ci\n", encoding="utf-8")
    os.chdir(bare)
    try:
        fresh = _invoke(["init", "--here", "--force", "--stack", "moodle3", *_INIT])
    finally:
        os.chdir(previous)
    assert fresh.exit_code == 0, fresh.output
    assert "defaulting to 'copilot'" in fresh.output.lower()
    assert "reusing installed integration 'copilot'" not in fresh.output.lower()

    both = tmp_path / "both"
    seeded = _invoke(
        ["init", str(both), "--integration", "cursor-agent", "--stack", "moodle3", *_INIT]
    )
    assert seeded.exit_code == 0, seeded.output
    (both / ".specify" / "integrations" / "copilot.manifest.json").write_text("{}\n", encoding="utf-8")
    both_state = json.loads((both / ".specify" / "integration.json").read_text(encoding="utf-8"))
    both_state.pop("integration", None)
    both_state.pop("default_integration", None)
    both_state["installed_integrations"] = ["cursor-agent", "copilot"]
    (both / ".specify" / "integration.json").write_text(json.dumps(both_state), encoding="utf-8")
    both_options = json.loads((both / ".specify" / "init-options.json").read_text(encoding="utf-8"))
    both_options.pop("integration", None)
    both_options.pop("ai", None)
    (both / ".specify" / "init-options.json").write_text(json.dumps(both_options), encoding="utf-8")

    monkeypatch.setattr(init_mod, "_stdin_is_interactive", lambda: True)
    chosen: list[str] = []

    def pick(*_args, **_kwargs):
        chosen.append("menu")
        return "cursor-agent"

    monkeypatch.setattr(init_mod, "select_with_arrows", pick)
    os.chdir(both)
    try:
        interactive = _invoke(
            ["init", "--here", "--force", "--stack", "moodle3", "--ignore-agent-tools", "--script", "sh", "--skip-external-skills"]
        )
    finally:
        os.chdir(previous)
    assert interactive.exit_code == 0, interactive.output
    assert chosen == ["menu"]
    assert json.loads((both / ".specify" / "integration.json").read_text(encoding="utf-8"))["integration"] == "cursor-agent"


def test_d25_07_legacy_hygiene_without_stack_key(tmp_path: Path) -> None:
    """A mas.1 file with no stack key keeps overrides when init-options matches."""
    import os

    project = tmp_path / "legacy"
    first = _invoke(
        ["init", str(project), "--integration", "none", "--stack", "nestjs-react", *_INIT]
    )
    assert first.exit_code == 0, first.output
    path = project / ".specify" / "hygiene.yml"
    loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    loaded.pop("stack", None)
    loaded["h4_mode"] = "warn"
    loaded["size_excludes"] = list(loaded["size_excludes"]) + ["local/scratch/"]
    loaded["debug_leftovers_exclude"] = ["src/legacy.ts"]
    path.write_text(yaml.safe_dump(loaded, sort_keys=False), encoding="utf-8")
    assert "stack:" not in path.read_text(encoding="utf-8")

    previous = os.getcwd()
    os.chdir(project)
    try:
        same = _invoke(
            ["init", "--here", "--force", "--integration", "none", "--stack", "nestjs-react", *_INIT]
        )
    finally:
        os.chdir(previous)
    assert same.exit_code == 0, same.output
    merged = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert merged["h4_mode"] == "warn"
    assert "local/scratch/" in merged["size_excludes"]
    assert "src/legacy.ts" in merged["debug_leftovers_exclude"]
    assert merged["stack"] == "nestjs-react"

    other = tmp_path / "other"
    seeded = _invoke(
        ["init", str(other), "--integration", "none", "--stack", "nestjs-react", *_INIT]
    )
    assert seeded.exit_code == 0, seeded.output
    other_path = other / ".specify" / "hygiene.yml"
    other_loaded = yaml.safe_load(other_path.read_text(encoding="utf-8"))
    other_loaded.pop("stack", None)
    other_loaded["h4_mode"] = "warn"
    other_loaded["size_excludes"] = list(other_loaded["size_excludes"]) + ["local/scratch/"]
    other_loaded["debug_leftovers_exclude"] = ["src/legacy.ts"]
    other_path.write_text(yaml.safe_dump(other_loaded, sort_keys=False), encoding="utf-8")
    options_path = other / ".specify" / "init-options.json"
    options = json.loads(options_path.read_text(encoding="utf-8"))
    options["stack"] = "moodle3"
    options_path.write_text(json.dumps(options), encoding="utf-8")
    os.chdir(other)
    try:
        switched = _invoke(
            ["init", "--here", "--force", "--integration", "none", "--stack", "nestjs-react", *_INIT]
        )
    finally:
        os.chdir(previous)
    assert switched.exit_code == 0, switched.output
    reset = yaml.safe_load(other_path.read_text(encoding="utf-8"))
    assert reset["h4_mode"] == "block"
    assert "local/scratch/" not in reset["size_excludes"]
    assert "src/legacy.ts" in reset["debug_leftovers_exclude"]
    assert reset["entrypoint_kind"] == "none"
    assert reset["stack"] == "nestjs-react"


def test_d25_04_implement_recommends_pull_request() -> None:
    core = CORE_IMPLEMENT.read_text(encoding="utf-8")
    nest = NEST_IMPLEMENT.read_text(encoding="utf-8")
    forbidden = "Do not push, do not open a pull request"
    assert forbidden not in core
    assert forbidden not in nest
    for text in (core, nest):
        assert ".github/pull_request_template.md" in text
        assert "Qué y por qué" in text
        assert "Fuera de alcance" in text
        assert "Riesgos/rollback" in text
        assert "Cómo se validó" in text
        assert "spec.md" in text
        assert "plan.md" in text
        assert "tasks.md" in text
        assert "check-hygiene" in text
        assert "testing" in text
        lowered = text.lower()
        assert "recommend" in lowered
        assert "does not merge" in lowered or "never merge" in lowered
        assert "developer accepts" in lowered or "developer accepts" in text


def test_d25_04_init_installs_pr_rule(tmp_path: Path) -> None:
    cursor_project = tmp_path / "cursor"
    copilot_project = tmp_path / "copilot"
    cursor = _invoke(
        ["init", str(cursor_project), "--integration", "cursor-agent", "--stack", "moodle3", *_INIT]
    )
    assert cursor.exit_code == 0, cursor.output
    rule = (cursor_project / ".cursor/rules/pr.mdc").read_text(encoding="utf-8")
    assert ".github/pull_request_template.md" in rule
    assert "never merge" in rule.lower() or "does not merge" in rule.lower()
    assert not (cursor_project / "AGENTS.md").exists() or "mas-pr-rule:start" not in (
        cursor_project / "AGENTS.md"
    ).read_text(encoding="utf-8")

    copilot = _invoke(
        ["init", str(copilot_project), "--integration", "copilot", "--stack", "moodle3", *_INIT]
    )
    assert copilot.exit_code == 0, copilot.output
    agents = (copilot_project / "AGENTS.md").read_text(encoding="utf-8")
    assert "mas-pr-rule:start" in agents
    assert ".github/pull_request_template.md" in agents
    assert not (copilot_project / ".cursor/rules/pr.mdc").exists()


def test_d25_04_constitution_patch_mentions_agent_pr() -> None:
    text = (REPO / "presets/mas-core/templates/constitution-template.md").read_text(encoding="utf-8")
    assert "**Version**: 1.2.1" in text
    assert "recomendado; aplica criterio" in text
    lowered = text.lower()
    assert "does not merge" in lowered or "does not merge it" in lowered
    assert "developer accepts" in lowered
