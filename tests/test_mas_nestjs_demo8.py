"""D8-01 and D8-02: phase commits are explicit, and MCP uses forRoot."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest
from typer.testing import CliRunner

from specify_cli import app
from tests.conftest import requires_bash

REPO = Path(__file__).resolve().parents[1]
HAS_PWSH = shutil.which("pwsh") is not None
OPTS = [
    "--ignore-agent-tools",
    "--script",
    "sh",
    "--skip-external-skills",
    "--non-interactive",
]
PHASES = ("specify", "clarify", "plan", "tasks")


def _git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        check=check,
        capture_output=True,
        text=True,
    )


def _init_stack(project: Path) -> None:
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "cursor-agent", "--stack", "nestjs-react", *OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output


@pytest.fixture(scope="module")
def stack_project(tmp_path_factory: pytest.TempPathFactory) -> Path:
    project = tmp_path_factory.mktemp("d8") / "stack"
    _init_stack(project)
    return project


def _skill(project: Path, name: str) -> str:
    return (project / ".cursor" / "skills" / f"speckit-{name}" / "SKILL.md").read_text(encoding="utf-8")


def test_specify_and_clarify_skills_commit(stack_project: Path) -> None:
    for phase in PHASES:
        text = _skill(stack_project, phase)
        assert "```bash" in text
        assert "```powershell" in text
        assert "git add -A" in text
        assert f'git commit -m "speckit.{phase}"' in text
        assert "speckit.git.commit" in text
    specify = _skill(stack_project, "specify")
    assert "finish-feature" in specify
    assert "git branch main" in specify


def _run_commit(repo: Path, message: str) -> None:
    _git(repo, "add", "-A")
    _git(repo, "commit", "-m", message)


def _finish(repo: Path, flavor: str) -> subprocess.CompletedProcess[str]:
    if flavor == "bash":
        command = ["bash", str(repo / ".specify" / "scripts" / "bash" / "finish-feature.sh")]
    else:
        command = [
            "pwsh",
            "-NoProfile",
            "-File",
            str(repo / ".specify" / "scripts" / "powershell" / "finish-feature.ps1"),
        ]
    return subprocess.run(command, cwd=repo, capture_output=True, text=True, check=False)


def _create_feature(repo: Path, flavor: str) -> None:
    if flavor == "bash":
        command = [
            "bash",
            str(repo / ".specify" / "scripts" / "bash" / "create-new-feature.sh"),
            "--json",
            "--short-name",
            "user-login",
            "Add user login",
        ]
    else:
        command = [
            "pwsh",
            "-NoProfile",
            "-File",
            str(repo / ".specify" / "scripts" / "powershell" / "create-new-feature.ps1"),
            "-Json",
            "-ShortName",
            "user-login",
            "Add user login",
        ]
    created = subprocess.run(command, cwd=repo, capture_output=True, text=True, check=False)
    assert created.returncode == 0, created.stderr + created.stdout
    assert json.loads(created.stdout)["BRANCH_NAME"].endswith("user-login")


def _prepare_empty_repo(repo: Path, flavor: str) -> None:
    repo.mkdir()
    _git(repo, "init", "-b", "main")
    _git(repo, "config", "user.email", "demo8@example.com")
    _git(repo, "config", "user.name", "Demo8")
    scripts = repo / ".specify" / "scripts" / flavor
    scripts.mkdir(parents=True)
    source = REPO / "scripts" / flavor
    names = (
        ("common.sh", "create-new-feature.sh", "finish-feature.sh")
        if flavor == "bash"
        else ("common.ps1", "create-new-feature.ps1", "finish-feature.ps1")
    )
    for name in names:
        target = scripts / name
        shutil.copy(source / name, target)
        if flavor == "bash":
            target.chmod(0o755)
    templates = repo / ".specify" / "templates"
    templates.mkdir()
    (templates / "spec-template.md").write_text("# spec\n", encoding="utf-8")


def _specify_then_finish(repo: Path, flavor: str) -> None:
    _prepare_empty_repo(repo, flavor)
    _create_feature(repo, flavor)
    (repo / "specs").joinpath("note.txt").parent.mkdir(exist_ok=True)
    (repo / "phase.txt").write_text("specify\n", encoding="utf-8")
    _run_commit(repo, "speckit.specify")
    specify_sha = _git(repo, "rev-parse", "HEAD").stdout.strip()
    root = _git(repo, "rev-list", "--max-parents=0", "HEAD").stdout.splitlines()[0].strip()
    assert specify_sha == root
    (repo / "phase.txt").write_text("later\n", encoding="utf-8")
    _run_commit(repo, "speckit.plan")
    feature_sha = _git(repo, "rev-parse", "HEAD").stdout.strip()
    finished = _finish(repo, flavor)
    assert finished.returncode == 0, finished.stderr + finished.stdout
    assert _git(repo, "symbolic-ref", "--short", "HEAD").stdout.strip() == "main"
    parents = _git(repo, "rev-list", "--parents", "-n", "1", "HEAD").stdout.split()
    assert parents[1] == specify_sha
    assert parents[2] == feature_sha
    assert _git(repo, "merge-base", "--is-ancestor", specify_sha, "HEAD").returncode == 0


@requires_bash
def test_specify_commit_is_main_root_after_finish(tmp_path: Path) -> None:
    _specify_then_finish(tmp_path / "repo", "bash")


@pytest.mark.skipif(not HAS_PWSH, reason="pwsh is required")
def test_specify_commit_is_main_root_after_finish_powershell(tmp_path: Path) -> None:
    _specify_then_finish(tmp_path / "repo", "powershell")


def test_mcp_registration_uses_for_root(stack_project: Path) -> None:
    skeleton = (
        REPO / "presets/mas-stack-nestjs-react/reference/apps/api/src/modules/mcp/mcp.module.ts"
    ).read_text(encoding="utf-8")
    assert "McpModule.forRoot(" in skeleton
    assert "McpModule.forRootAsync" not in skeleton

    banned = "McpModule.forRootAsync"
    offenders: list[str] = []
    roots = [
        stack_project / ".specify",
        stack_project / ".cursor",
        REPO / "presets/mas-stack-nestjs-react",
        REPO / "presets/mas-core",
        REPO / "docs/mas",
        REPO / "src/specify_cli/mas.py",
    ]
    for root in roots:
        paths = [root] if root.is_file() else root.rglob("*")
        for path in paths:
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".md", ".py", ".yml", ".yaml", ".ts", ".json"}:
                continue
            if "node_modules" in path.parts:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            if banned in text:
                offenders.append(str(path))
    assert offenders == []
    constitution = (stack_project / ".specify" / "memory" / "constitution.md").read_text(encoding="utf-8")
    assert "McpModule.forRoot({ decorators: [Public(), SkipCsrf()] })" in constitution


def test_prototype_fidelity_is_wired() -> None:
    root = REPO / "presets/mas-stack-nestjs-react"
    constitution = (root / "templates/constitution-template-append.md").read_text(encoding="utf-8")
    assert "Prototype fidelity" in constitution
    assert "fidelity-map.json" in constitution
    for name in ("speckit.specify.md", "speckit.plan.md", "speckit.tasks.md", "speckit.implement.md"):
        text = (root / "commands" / name).read_text(encoding="utf-8")
        assert "fidelity" in text.lower()
    workflow = (REPO / ".github/workflows/nestjs-react-smoke.yml").read_text(encoding="utf-8")
    assert "test:fidelity" in workflow
    assert (root / "fixtures/fidelity/fidelity-map.json").is_file()
    assert (root / "reference/apps/web/e2e/fidelity.ts").is_file()
    package = (root / "reference/package.json").read_text(encoding="utf-8")
    assert '"dev"' in package
    assert "test:fidelity" in package
