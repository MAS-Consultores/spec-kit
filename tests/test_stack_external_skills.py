"""Tests for MAS stack external skills installation."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from typer.testing import CliRunner

from specify_cli import app
from specify_cli.mas import get_mas_stack
from specify_cli.stack_skills import (
    ExternalSkillSpec,
    _run_skills_add,
    build_skills_add_command,
    external_skills_to_init_payload,
    install_stack_external_skills,
    integration_to_skills_agent,
    load_stack_skill_manifest,
    resolve_stack_external_skills,
    sync_skills_to_integration_dir,
)


def test_load_stack_skill_manifest_from_mas_core():
    from specify_cli._assets import _locate_bundled_preset

    preset_dir = _locate_bundled_preset("mas-core")
    assert preset_dir is not None
    specs = load_stack_skill_manifest(preset_dir)
    assert len(specs) >= 1
    assert any(s.skill == "find-skills" for s in specs)


def test_resolve_stack_external_skills_merges_core_and_stack():
    stack = get_mas_stack("laravel-inertia-react")
    assert stack is not None
    specs = resolve_stack_external_skills(stack)
    skill_names = {s.skill for s in specs}
    assert "find-skills" in skill_names
    assert "vercel-react-best-practices" in skill_names
    assert "laravel-inertia-react" in skill_names


def test_resolve_stack_external_skills_dedupes():
    stack = get_mas_stack("moodle5-plugin")
    assert stack is not None
    specs = resolve_stack_external_skills(stack)
    keys = [s.dedupe_key() for s in specs]
    assert len(keys) == len(set(keys))


def test_build_skills_add_command():
    spec = ExternalSkillSpec(source="vercel-labs/skills", skill="find-skills")
    cmd = build_skills_add_command(
        spec, skills_agent="codex", npx_executable="npx"
    )
    assert cmd[:4] == ["npx", "--yes", "skills", "add"]
    assert "vercel-labs/skills" in cmd
    assert "--skill" in cmd
    assert "find-skills" in cmd
    assert "-y" in cmd
    assert "--copy" in cmd
    assert "-a" in cmd
    assert "codex" in cmd


def test_integration_to_skills_agent_mapping():
    assert integration_to_skills_agent("codex") == "codex"
    assert integration_to_skills_agent("claude") == "claude-code"
    assert integration_to_skills_agent("cursor-agent") == "cursor"


def test_build_skills_add_command_uses_resolved_npx_on_windows(monkeypatch):
    fake_npx = r"C:\Program Files\nodejs\npx.cmd"
    monkeypatch.setattr(
        "specify_cli.stack_skills._resolve_npx_executable",
        lambda: fake_npx,
    )
    spec = ExternalSkillSpec(source="vercel-labs/skills", skill="find-skills")
    cmd = build_skills_add_command(spec, skills_agent="cursor")
    assert cmd[0] == fake_npx
    assert cmd[1:4] == ["--yes", "skills", "add"]


def test_run_skills_add_passes_resolved_npx_to_subprocess(tmp_path, monkeypatch):
    fake_npx = r"C:\fake\npx.cmd"
    monkeypatch.setattr(
        "specify_cli.stack_skills._resolve_npx_executable",
        lambda: fake_npx,
    )
    captured: list[list[str]] = []

    def fake_runner(cmd, **kwargs):
        captured.append(list(cmd))
        return subprocess.CompletedProcess(cmd, 0, "", "")

    spec = ExternalSkillSpec(source="vercel-labs/skills", skill="find-skills")
    ok, reason = _run_skills_add(
        tmp_path,
        spec,
        skills_agent="codex",
        timeout=30,
        runner=fake_runner,
    )
    assert ok is True
    assert reason == ""
    assert len(captured) == 1
    assert captured[0][0] == fake_npx


def test_external_skills_to_init_payload():
    from specify_cli.stack_skills import ExternalSkillResult

    payload = external_skills_to_init_payload(
        [
            ExternalSkillResult(
                source="vercel-labs/skills",
                skill="find-skills",
                status="installed",
            ),
        ]
    )
    assert payload[0]["status"] == "installed"
    assert payload[0]["skill"] == "find-skills"


def test_sync_skills_to_integration_dir_cursor(tmp_path):
    canonical = tmp_path / ".agents" / "skills"
    target = tmp_path / ".cursor" / "skills"
    canonical.mkdir(parents=True)
    target.mkdir(parents=True)

    skill_dir = canonical / "find-skills"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(
        "---\nname: find-skills\ndescription: test\n---\n\nbody\n",
        encoding="utf-8",
    )

    sync_skills_to_integration_dir(
        tmp_path,
        skills_agent="cursor",
        integration_skills_dir=target,
        skill_names=("find-skills",),
    )

    assert (target / "find-skills" / "SKILL.md").is_file()
    assert not (target / "speckit-plan").exists()


def test_sync_skills_to_integration_dir_skips_speckit(tmp_path):
    canonical = tmp_path / ".agents" / "skills"
    target = tmp_path / ".cursor" / "skills"
    canonical.mkdir(parents=True)
    target.mkdir(parents=True)

    (target / "speckit-plan").mkdir()
    (target / "speckit-plan" / "SKILL.md").write_text("keep", encoding="utf-8")

    skill_dir = canonical / "find-skills"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(
        "---\nname: find-skills\ndescription: test\n---\n",
        encoding="utf-8",
    )

    sync_skills_to_integration_dir(
        tmp_path,
        skills_agent="cursor",
        integration_skills_dir=target,
        skill_names=("find-skills",),
    )

    assert (target / "speckit-plan" / "SKILL.md").read_text() == "keep"


def test_install_stack_external_skills_mock_runner(tmp_path, monkeypatch):
    from specify_cli.integrations.codex import CodexIntegration

    stack = get_mas_stack("moodle5-plugin")
    assert stack is not None

    monkeypatch.setattr(
        "specify_cli.stack_skills._resolve_npx_executable",
        lambda: "npx",
    )

    calls: list[list[str]] = []

    def fake_runner(cmd, **kwargs):
        calls.append(list(cmd))
        return subprocess.CompletedProcess(cmd, 0, "", "")

    results = install_stack_external_skills(
        tmp_path,
        stack,
        CodexIntegration(),
        selected_ai="codex",
        ai_skills=True,
        runner=fake_runner,
        get_skills_dir=lambda _root, _ai: tmp_path / ".agents" / "skills",
    )

    assert len(calls) >= 1
    assert any(r.status == "installed" for r in results)
    assert calls[0][0] == "npx"


def test_install_stack_external_skills_skip_flag(tmp_path):
    from specify_cli.integrations.codex import CodexIntegration

    stack = get_mas_stack("moodle5-plugin")
    assert stack is not None

    results = install_stack_external_skills(
        tmp_path,
        stack,
        CodexIntegration(),
        selected_ai="codex",
        ai_skills=True,
        skip=True,
    )
    assert all(r.status == "skipped" for r in results)
    assert results[0].reason == "--skip-external-skills"


def test_install_stack_external_skills_gemini_skipped(tmp_path):
    from specify_cli.integrations.gemini import GeminiIntegration

    stack = get_mas_stack("moodle5-plugin")
    assert stack is not None

    results = install_stack_external_skills(
        tmp_path,
        stack,
        GeminiIntegration(),
        selected_ai="gemini",
        ai_skills=False,
    )
    assert results
    assert all(r.status == "skipped" for r in results)
    assert results[0].reason == "not_skills_integration"


def test_init_with_skip_external_skills_no_npx(tmp_path, monkeypatch):
    project = tmp_path / "skip-ext"
    monkeypatch.setattr(
        "specify_cli.stack_skills._npx_available",
        lambda: False,
    )

    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "moodle5-plugin",
            "--skip-external-skills",
            "--ignore-agent-tools",
            "--no-git",
            "--script",
            "sh",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output
    payload = json.loads((project / ".specify" / "init-options.json").read_text())
    external = payload.get("external_skills", [])
    assert external
    assert all(item["status"] == "skipped" for item in external)


def test_init_external_skills_metadata_with_mock_npx(tmp_path, monkeypatch):
    project = tmp_path / "mock-ext"
    calls: list[list[str]] = []

    def fake_runner(cmd, **kwargs):
        calls.append(list(cmd))
        agent_dir = project / ".agents" / "skills"
        agent_dir.mkdir(parents=True, exist_ok=True)
        skill_name = cmd[cmd.index("--skill") + 1]
        skill_path = agent_dir / skill_name
        skill_path.mkdir(exist_ok=True)
        (skill_path / "SKILL.md").write_text(
            f"---\nname: {skill_name}\ndescription: test\n---\n",
            encoding="utf-8",
        )
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(
        "specify_cli.stack_skills._run_skills_add",
        lambda project_root, spec, *, skills_agent, timeout, runner=None: (
            True,
            "",
        ),
    )
    monkeypatch.setattr(
        "specify_cli.stack_skills._npx_available",
        lambda: True,
    )

    def fake_sync(project_root, *, skills_agent, integration_skills_dir, skill_names):
        for name in skill_names:
            dest = integration_skills_dir / name
            dest.mkdir(parents=True, exist_ok=True)
            (dest / "SKILL.md").write_text(
                f"---\nname: {name}\ndescription: test\n---\n",
                encoding="utf-8",
            )

    monkeypatch.setattr(
        "specify_cli.stack_skills.sync_skills_to_integration_dir",
        fake_sync,
    )

    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "codex",
            "--stack",
            "laravel-inertia-react",
            "--ignore-agent-tools",
            "--no-git",
            "--script",
            "sh",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output
    payload = json.loads((project / ".specify" / "init-options.json").read_text())
    external = payload.get("external_skills", [])
    assert len(external) >= 3
    installed = [e for e in external if e["status"] == "installed"]
    assert len(installed) >= 3
    assert (project / ".agents" / "skills" / "find-skills" / "SKILL.md").exists()


def test_init_laravel_stack_external_skills_cursor_sync(tmp_path, monkeypatch):
    project = tmp_path / "cursor-ext"

    monkeypatch.setattr(
        "specify_cli.stack_skills._npx_available",
        lambda: True,
    )
    monkeypatch.setattr(
        "specify_cli.stack_skills._run_skills_add",
        lambda project_root, spec, *, skills_agent, timeout, runner=None: (
            True,
            "",
        ),
    )

    def fake_sync(project_root, *, skills_agent, integration_skills_dir, skill_names):
        for name in skill_names:
            dest = integration_skills_dir / name
            dest.mkdir(parents=True, exist_ok=True)
            (dest / "SKILL.md").write_text(
                f"---\nname: {name}\ndescription: test\n---\n",
                encoding="utf-8",
            )

    monkeypatch.setattr(
        "specify_cli.stack_skills.sync_skills_to_integration_dir",
        fake_sync,
    )

    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "cursor-agent",
            "--stack",
            "laravel-inertia-react",
            "--ignore-agent-tools",
            "--no-git",
            "--script",
            "sh",
        ],
        catch_exceptions=False,
    )

    assert result.exit_code == 0, result.output
    assert (project / ".cursor" / "skills" / "find-skills" / "SKILL.md").exists()
    assert (
        project / ".cursor" / "skills" / "vercel-react-best-practices" / "SKILL.md"
    ).exists()
