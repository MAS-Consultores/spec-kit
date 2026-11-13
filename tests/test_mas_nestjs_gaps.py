"""Executable checks for the NestJS demo gaps. Text in the constitution is not enough."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

from tests.conftest import requires_bash

REPO = Path(__file__).resolve().parents[1]
HAS_PWSH = shutil.which("pwsh") is not None


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True)


def _init_git(repo: Path, branch: str, commit: bool) -> None:
    repo.mkdir(parents=True)
    _git(repo, "init", "-b", branch)
    _git(repo, "config", "user.email", "gap@example.com")
    _git(repo, "config", "user.name", "Gap")
    if commit:
        (repo / "README.md").write_text("base\n", encoding="utf-8")
        _git(repo, "add", "README.md")
        _git(repo, "commit", "-m", "base")


def _install_bash(repo: Path) -> None:
    dest = repo / ".specify" / "scripts" / "bash"
    dest.mkdir(parents=True)
    for name in ("common.sh", "create-new-feature.sh", "setup-plan.sh", "setup-tasks.sh", "ensure-feature-branch.sh"):
        target = dest / name
        shutil.copy(REPO / "scripts" / "bash" / name, target)
        target.chmod(0o755)
    templates = repo / ".specify" / "templates"
    templates.mkdir(parents=True)
    (templates / "spec-template.md").write_text("# spec\n", encoding="utf-8")
    (templates / "plan-template.md").write_text("# plan\n", encoding="utf-8")
    (templates / "tasks-template.md").write_text("# tasks\n", encoding="utf-8")


def _install_ps(repo: Path) -> None:
    dest = repo / ".specify" / "scripts" / "powershell"
    dest.mkdir(parents=True)
    for name in (
        "common.ps1",
        "create-new-feature.ps1",
        "setup-plan.ps1",
        "setup-tasks.ps1",
        "ensure-feature-branch.ps1",
    ):
        shutil.copy(REPO / "scripts" / "powershell" / name, dest / name)


def _head(repo: Path) -> str:
    result = subprocess.run(
        ["git", "symbolic-ref", "--quiet", "HEAD"],
        cwd=repo,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


@pytest.mark.parametrize("commit", [False, True])
@requires_bash
def test_create_new_feature_checks_out_branch(tmp_path: Path, commit: bool) -> None:
    repo = tmp_path / "repo"
    _init_git(repo, "main", commit)
    _install_bash(repo)
    script = repo / ".specify" / "scripts" / "bash" / "create-new-feature.sh"
    result = subprocess.run(
        ["bash", str(script), "--json", "--short-name", "user-login", "Add user login"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert _head(repo) == f"refs/heads/{payload['BRANCH_NAME']}"


@requires_bash
def test_setup_tasks_writes_tasks_md(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    _init_git(repo, "main", True)
    _install_bash(repo)
    script = repo / ".specify" / "scripts" / "bash" / "create-new-feature.sh"
    created = subprocess.run(
        ["bash", str(script), "--json", "--short-name", "user-login", "Add user login"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert created.returncode == 0, created.stderr
    branch = json.loads(created.stdout)["BRANCH_NAME"]
    plan = subprocess.run(
        ["bash", str(repo / ".specify" / "scripts" / "bash" / "setup-plan.sh")],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert plan.returncode == 0, plan.stderr
    tasks = subprocess.run(
        ["bash", str(repo / ".specify" / "scripts" / "bash" / "setup-tasks.sh"), "--json"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert tasks.returncode == 0, tasks.stderr
    written = repo / "specs" / branch / "tasks.md"
    assert written.is_file()
    assert written.read_text(encoding="utf-8").startswith("# tasks")
    assert "TASKS_TEMPLATE_CONTENT" not in written.read_text(encoding="utf-8")


@pytest.mark.parametrize("branch", ["main", "master"])
@requires_bash
def test_ensure_feature_branch_rejects_default_branches(tmp_path: Path, branch: str) -> None:
    repo = tmp_path / "repo"
    _init_git(repo, branch, True)
    _install_bash(repo)
    result = subprocess.run(
        ["bash", str(repo / ".specify" / "scripts" / "bash" / "ensure-feature-branch.sh")],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 1
    assert branch in result.stderr


@requires_bash
def test_ensure_feature_branch_accepts_feature(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    _init_git(repo, "main", True)
    _git(repo, "checkout", "-b", "001-user-login")
    _install_bash(repo)
    (repo / ".specify" / "feature.json").write_text(
        json.dumps({"feature_directory": "specs/001-user-login"}),
        encoding="utf-8",
    )
    result = subprocess.run(
        ["bash", str(repo / ".specify" / "scripts" / "bash" / "ensure-feature-branch.sh")],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.skipif(not HAS_PWSH, reason="pwsh is required")
@pytest.mark.parametrize("commit", [False, True])
def test_powershell_feature_checkout_and_tasks(tmp_path: Path, commit: bool) -> None:
    repo = tmp_path / "repo"
    _init_git(repo, "main", commit)
    _install_ps(repo)
    created = subprocess.run(
        [
            "pwsh",
            "-NoProfile",
            "-File",
            str(repo / ".specify" / "scripts" / "powershell" / "create-new-feature.ps1"),
            "-Json",
            "-ShortName",
            "user-login",
            "Add user login",
        ],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert created.returncode == 0, created.stderr + created.stdout
    payload = json.loads(created.stdout)
    assert _head(repo) == f"refs/heads/{payload['BRANCH_NAME']}"
    if not commit:
        return
    plan = subprocess.run(
        ["pwsh", "-NoProfile", "-File", str(repo / ".specify" / "scripts" / "powershell" / "setup-plan.ps1")],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert plan.returncode == 0, plan.stderr
    tasks = subprocess.run(
        [
            "pwsh",
            "-NoProfile",
            "-File",
            str(repo / ".specify" / "scripts" / "powershell" / "setup-tasks.ps1"),
            "-Json",
        ],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert tasks.returncode == 0, tasks.stderr
    written = repo / "specs" / payload["BRANCH_NAME"] / "tasks.md"
    assert written.is_file()
    assert written.read_text(encoding="utf-8").startswith("# tasks")


def test_skills_call_ensure_feature_branch_and_mark_analyze_readonly() -> None:
    plan = (REPO / "presets/mas-core/commands/speckit.plan.md").read_text(encoding="utf-8")
    tasks = (REPO / "presets/mas-core/commands/speckit.tasks.md").read_text(encoding="utf-8")
    implement = (REPO / "presets/mas-core/commands/speckit.implement.md").read_text(encoding="utf-8")
    analyze = (REPO / "presets/mas-stack-nestjs-react/commands/speckit.analyze.md").read_text(encoding="utf-8")
    specify = (REPO / "presets/mas-core/commands/speckit.specify.md").read_text(encoding="utf-8")
    for text in (plan, tasks, implement):
        assert "ensure-feature-branch.sh" in text
        assert "ensure-feature-branch.ps1" in text
    assert "does not create a commit" in analyze
    assert "no commits" in specify


def test_check_casl_accepts_permissions_ts(tmp_path: Path) -> None:
    node = shutil.which("node")
    npm = shutil.which("npm")
    if node is None or npm is None:
        pytest.skip("node is required")
    src = tmp_path / "apps" / "api" / "src" / "modules" / "notes"
    src.mkdir(parents=True)
    (src / "permissions.ts").write_text(
        'export const manifest = { category: "notes", actions: [{ code: "ver" }] };\n',
        encoding="utf-8",
    )
    (src / "notes.controller.ts").write_text(
        "export class Notes {\n  @Get()\n  @Can(\"notes:ver\")\n  list() {}\n}\n",
        encoding="utf-8",
    )
    script = tmp_path / "check-casl.ts"
    script.write_bytes((REPO / "presets/mas-stack-nestjs-react/templates/check-casl.ts").read_bytes())
    install = subprocess.run(
        [npm, "install", "--silent", "typescript@5.9.3"],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )
    if install.returncode != 0:
        pytest.fail(install.stderr or install.stdout)
    run = subprocess.run(
        [node, "--experimental-strip-types", "--no-warnings", str(script)],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr
    assert "casl:check ok" in run.stdout


def test_reference_lockfile_is_what_init_installs(tmp_path: Path) -> None:
    from typer.testing import CliRunner
    from specify_cli import app

    project = tmp_path / "proj"
    project.mkdir()
    subprocess.run(["git", "init", "-b", "main"], cwd=project, check=True, capture_output=True)
    env = os.environ.copy()
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "cursor-agent",
            "--stack",
            "nestjs-react",
            "--ignore-agent-tools",
            "--script",
            "sh",
            "--skip-external-skills",
            "--non-interactive",
            "--force",
        ],
        catch_exceptions=False,
        env=env,
    )
    assert result.exit_code == 0, result.output
    installed = project / ".specify" / "reference" / "pnpm-lock.yaml"
    source = REPO / "presets/mas-stack-nestjs-react/reference/pnpm-lock.yaml"
    assert installed.read_bytes() == source.read_bytes()
    for relative in (
        "package.json",
        "apps/api/package.json",
        "apps/web/package.json",
        "packages/contracts/package.json",
        "packages/ui/package.json",
    ):
        assert (project / ".specify" / "reference" / relative).read_bytes() == (
            REPO / "presets/mas-stack-nestjs-react/reference" / relative
        ).read_bytes()
