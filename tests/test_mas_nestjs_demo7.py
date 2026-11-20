"""D7-01: finish-feature merges onto main, including a repository born empty."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from tests.conftest import requires_bash

REPO = Path(__file__).resolve().parents[1]
HAS_PWSH = shutil.which("pwsh") is not None


def _git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        check=check,
        capture_output=True,
        text=True,
    )


def _init_git(repo: Path, *, with_main_commit: bool) -> None:
    repo.mkdir(parents=True)
    _git(repo, "init", "-b", "main")
    _git(repo, "config", "user.email", "demo7@example.com")
    _git(repo, "config", "user.name", "Demo7")
    if with_main_commit:
        (repo / "README.md").write_text("base\n", encoding="utf-8")
        _git(repo, "add", "README.md")
        _git(repo, "commit", "-m", "base")


def _install(repo: Path, flavor: str) -> None:
    dest = repo / ".specify" / "scripts" / flavor
    dest.mkdir(parents=True)
    source = REPO / "scripts" / flavor
    names = (
        ("common.sh", "create-new-feature.sh", "finish-feature.sh")
        if flavor == "bash"
        else ("common.ps1", "create-new-feature.ps1", "finish-feature.ps1")
    )
    for name in names:
        target = dest / name
        shutil.copy(source / name, target)
        if flavor == "bash":
            target.chmod(0o755)
    templates = repo / ".specify" / "templates"
    templates.mkdir(parents=True)
    (templates / "spec-template.md").write_text("# spec\n", encoding="utf-8")


def _create_feature(repo: Path, flavor: str) -> str:
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
    return json.loads(created.stdout)["BRANCH_NAME"]


def _commit_phases(repo: Path, phases: tuple[str, ...]) -> None:
    for phase in phases:
        path = repo / f"{phase}.txt"
        path.write_text(phase + "\n", encoding="utf-8")
        if phase == "specify":
            _git(repo, "add", "-A")
        else:
            _git(repo, "add", path.name)
        _git(repo, "commit", "-m", phase)


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


def _assert_merged(repo: Path, feature_sha: str, first_parent: str) -> None:
    head = _git(repo, "symbolic-ref", "--short", "HEAD").stdout.strip()
    assert head == "main"
    parents = _git(repo, "rev-list", "--parents", "-n", "1", "HEAD").stdout.split()
    assert len(parents) == 3
    assert parents[1] == first_parent
    assert parents[2] == feature_sha
    assert _git(repo, "merge-base", "--is-ancestor", feature_sha, "HEAD").returncode == 0
    assert _git(repo, "status", "--porcelain").stdout.strip() == ""


def _run_flow(repo: Path, flavor: str, *, with_main_commit: bool) -> None:
    _init_git(repo, with_main_commit=with_main_commit)
    base = _git(repo, "rev-parse", "HEAD").stdout.strip() if with_main_commit else ""
    _install(repo, flavor)
    _create_feature(repo, flavor)
    _commit_phases(repo, ("specify", "plan", "implement"))
    feature_sha = _git(repo, "rev-parse", "HEAD").stdout.strip()
    root = _git(repo, "rev-list", "--max-parents=0", "HEAD").stdout.splitlines()[0].strip()
    finished = _finish(repo, flavor)
    assert finished.returncode == 0, finished.stderr + finished.stdout
    _assert_merged(repo, feature_sha, base or root)


@requires_bash
@pytest.mark.parametrize("with_main_commit", [False, True])
def test_finish_feature_bash(tmp_path: Path, with_main_commit: bool) -> None:
    _run_flow(tmp_path / "repo", "bash", with_main_commit=with_main_commit)


@requires_bash
def test_finish_feature_bash_rejects_dirty_tree(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    _init_git(repo, with_main_commit=False)
    _install(repo, "bash")
    branch = _create_feature(repo, "bash")
    _commit_phases(repo, ("specify", "plan", "implement"))
    (repo / "dirty.txt").write_text("dirty\n", encoding="utf-8")
    finished = _finish(repo, "bash")
    assert finished.returncode == 1
    assert "dirty" in finished.stderr
    assert _git(repo, "symbolic-ref", "--short", "HEAD").stdout.strip() == branch
    assert _git(repo, "show-ref", "--verify", "refs/heads/main", check=False).returncode != 0


@pytest.mark.skipif(not HAS_PWSH, reason="pwsh is required")
@pytest.mark.parametrize("with_main_commit", [False, True])
def test_finish_feature_powershell(tmp_path: Path, with_main_commit: bool) -> None:
    _run_flow(tmp_path / "repo", "powershell", with_main_commit=with_main_commit)


@pytest.mark.skipif(not HAS_PWSH, reason="pwsh is required")
def test_finish_feature_powershell_rejects_dirty_tree(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    _init_git(repo, with_main_commit=True)
    _install(repo, "powershell")
    branch = _create_feature(repo, "powershell")
    _commit_phases(repo, ("specify", "plan", "implement"))
    (repo / "README.md").write_text("dirty\n", encoding="utf-8")
    finished = _finish(repo, "powershell")
    assert finished.returncode == 1
    assert "dirty" in finished.stderr
    assert _git(repo, "symbolic-ref", "--short", "HEAD").stdout.strip() == branch


def test_skills_call_finish_feature() -> None:
    implement = (REPO / "presets/mas-core/commands/speckit.implement.md").read_text(encoding="utf-8")
    specify = (REPO / "presets/mas-core/commands/speckit.specify.md").read_text(encoding="utf-8")
    plan = (REPO / "presets/mas-core/commands/speckit.plan.md").read_text(encoding="utf-8")
    tasks = (REPO / "presets/mas-core/commands/speckit.tasks.md").read_text(encoding="utf-8")
    assert "finish-feature.sh" in implement
    assert "finish-feature.ps1" in implement
    assert "git merge --no-ff" in implement
    assert "git branch main" not in implement
    assert "finish-feature" in specify
    assert "git branch main" in specify
    assert "Already up to date" in specify
    for text in (plan, tasks):
        assert "finish-feature" in text
        assert "Do not create `main`" in text
