"""D22: Conventional Commits 1.0.0 is mandatory on every MAS stack."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest
from typer.testing import CliRunner

from specify_cli import app

REPO = Path(__file__).resolve().parents[1]
STACKS = (
    "cakephp2-mysql",
    "moodle3",
    "moodle5-plugin",
    "moodle5-portal",
    "laravel-inertia-react",
    "nestjs-react",
)
URL = "https://www.conventionalcommits.org/en/v1.0.0/"
OPTS = [
    "--ignore-agent-tools",
    "--script",
    "sh",
    "--skip-external-skills",
    "--non-interactive",
    "--extension",
    "git",
]
PHASE_MESSAGES = {
    "specify": "docs(spec): specify <feature>",
    "clarify": "docs(spec): clarify <feature>",
    "plan": "docs(plan): plan <feature>",
    "tasks": "docs(tasks): generate tasks <feature>",
}
ACCEPTED = (
    "feat: x",
    "fix(api)!: x",
    "feat: x\n\nBREAKING CHANGE: removes the old endpoint\n",
    "Merge 001-x",
    'Revert "feat: x"',
    "fixup! feat: x",
    "squash! feat: x",
)
REJECTED = (
    "speckit.specify",
    "[Spec Kit] Add specification",
    "Feat: x",
    "wip: x",
    "feat:",
    "feat: ",
)


def _init(project: Path, stack: str) -> None:
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "cursor-agent", "--stack", stack, *OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output


@pytest.fixture(scope="module")
def projects(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Path]:
    root = tmp_path_factory.mktemp("d22")
    created: dict[str, Path] = {}
    for stack in STACKS:
        project = root / stack
        _init(project, stack)
        created[stack] = project
    return created


def _real_bash() -> str | None:
    """Return a bash that can run a script. The Windows ``bash`` stub is not one."""
    candidates = ["bash"]
    if os.name == "nt":
        candidates.append(r"C:\Program Files\Git\bin\bash.exe")
    for candidate in candidates:
        try:
            result = subprocess.run(
                [candidate, "-c", "echo ok"],
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            continue
        if result.returncode == 0 and result.stdout.strip() == "ok":
            return candidate
    return None


def _skill(project: Path, phase: str) -> str:
    return (project / ".cursor" / "skills" / f"speckit-{phase}" / "SKILL.md").read_text(encoding="utf-8")


def test_d22_01_constitution_principle_xi(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        text = (project / ".specify" / "memory" / "constitution.md").read_text(encoding="utf-8")
        assert "### XI. Commits Convencionales" in text, stack
        assert URL in text, stack
        assert "**Version**: 1.1.0" in text, stack


def test_d22_02_phase_commits_are_conventional(projects: dict[str, Path]) -> None:
    script = REPO / "presets/mas-core/scripts/bash/check-commit-msg.sh"
    bash = _real_bash()
    for stack, project in projects.items():
        for phase, message in PHASE_MESSAGES.items():
            text = _skill(project, phase)
            assert f'git commit -m "{message}"' in text, f"{stack} {phase}"
            assert 'git commit -m "speckit.' not in text, f"{stack} {phase}"
            if bash is None:
                continue
            checked = subprocess.run(
                [bash, str(script), message],
                capture_output=True,
                text=True,
                check=False,
            )
            assert checked.returncode == 0, checked.stderr
    if bash is None:
        pytest.skip("bash is not runnable on this host")


def test_d22_03_validators_and_ci_template(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        assert (project / ".specify" / "scripts" / "bash" / "check-commit-msg.sh").is_file(), stack
        assert (project / ".specify" / "scripts" / "powershell" / "check-commit-msg.ps1").is_file(), stack
        manifest = json.loads(
            (project / ".specify" / "integrations" / "speckit.manifest.json").read_text(encoding="utf-8")
        )
        assert ".specify/scripts/bash/check-commit-msg.sh" in manifest["files"], stack
        assert ".specify/scripts/powershell/check-commit-msg.ps1" in manifest["files"], stack
        workflow = (project / ".specify" / "templates" / "ci" / "conventional-commits.yml").read_text(
            encoding="utf-8"
        )
        assert "permissions:" in workflow and "contents: read" in workflow, stack
        assert "merge-base" in workflow, stack
        hook = (project / ".specify" / "templates" / "githooks" / "commit-msg").read_text(encoding="utf-8")
        assert "check-commit-msg.sh" in hook, stack


def test_d22_08_memory_states_the_rule(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        context = (project / ".specify" / "memory" / "stack-context.md").read_text(encoding="utf-8")
        assert URL in context, stack


def _run_validator(kind: str, message: str) -> subprocess.CompletedProcess[str]:
    if kind == "bash":
        bash = _real_bash()
        if bash is None:
            pytest.skip("bash is not runnable on this host")
        script = REPO / "presets/mas-core/scripts/bash/check-commit-msg.sh"
        if "\n" in message:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as handle:
                handle.write(message)
                path = handle.name
            args = [bash, str(script), path]
        else:
            args = [bash, str(script), message]
    else:
        script = REPO / "presets/mas-core/scripts/powershell/check-commit-msg.ps1"
        if "\n" in message:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as handle:
                handle.write(message)
                target = handle.name
        else:
            target = message
        args = ["pwsh", "-NoProfile", "-File", str(script), target]
    return subprocess.run(args, capture_output=True, text=True, check=False)


@pytest.mark.parametrize("kind", ["bash", "powershell"])
def test_d22_04_validator_fixtures(kind: str) -> None:
    if kind == "powershell" and shutil.which("pwsh") is None:
        pytest.skip("pwsh is required")
    for message in ACCEPTED:
        result = _run_validator(kind, message)
        assert result.returncode == 0, (message, result.stderr, result.stdout)
    for message in REJECTED:
        result = _run_validator(kind, message)
        assert result.returncode != 0, message


def test_d22_05_hook_rejects_invalid_and_accepts_valid(tmp_path: Path) -> None:
    repo = tmp_path / "hook-repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-b", "main"], cwd=repo, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "d22@example.com"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.name", "D22"], cwd=repo, check=True)
    hooks = repo / ".githooks"
    hooks.mkdir()
    specify = repo / ".specify" / "scripts" / "bash"
    specify.mkdir(parents=True)
    script = specify / "check-commit-msg.sh"
    shutil.copy(REPO / "presets/mas-core/scripts/bash/check-commit-msg.sh", script)
    script.chmod(0o755)
    hook = hooks / "commit-msg"
    shutil.copy(REPO / "presets/mas-core/templates/githooks/commit-msg", hook)
    hook.chmod(0o755)
    subprocess.run(["git", "config", "core.hooksPath", ".githooks"], cwd=repo, check=True)
    (repo / "note.txt").write_text("one\n", encoding="utf-8")
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True)
    rejected = subprocess.run(
        ["git", "commit", "-m", "speckit.specify"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert rejected.returncode != 0, rejected.stdout + rejected.stderr
    accepted = subprocess.run(
        ["git", "commit", "-m", "feat: x"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert accepted.returncode == 0, accepted.stdout + accepted.stderr


def test_d22_06_nestjs_commitlint_skeleton() -> None:
    root = REPO / "presets/mas-stack-nestjs-react/reference"
    package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    assert package["devDependencies"]["@commitlint/cli"] == "21.2.4"
    assert package["devDependencies"]["@commitlint/config-conventional"] == "21.2.4"
    assert "config-conventional" in (root / "commitlint.config.mjs").read_text(encoding="utf-8")
    hook = (root / ".githooks" / "commit-msg").read_text(encoding="utf-8")
    assert 'pnpm exec commitlint --edit "$1"' in hook
    workflow = (root / ".github" / "workflows" / "commits.yml").read_text(encoding="utf-8")
    assert "commits:" in workflow
    assert "contents: read" in workflow
    assert "check-commits.mjs" in workflow
    checker = (root / "scripts" / "check-commits.mjs").read_text(encoding="utf-8")
    assert "resolveMergeBase" in checker
    assert "no se pudo calcular la base" in checker
    agents = (root / "AGENTS.md").read_text(encoding="utf-8")
    assert "## Commits" in agents
    assert URL in agents
    npm = shutil.which("npm")
    if npm is None:
        pytest.fail("npm is required to execute commitlint")
    with tempfile.TemporaryDirectory() as temporary:
        installed = subprocess.run(
            [
                npm, "install", "--ignore-scripts", "--no-fund", "--no-audit",
                "@commitlint/cli@21.2.4",
                "@commitlint/config-conventional@21.2.4",
            ],
            cwd=temporary,
            capture_output=True,
            text=True,
            check=False,
        )
        assert installed.returncode == 0, installed.stdout + installed.stderr
        shutil.copy(root / "commitlint.config.mjs", Path(temporary) / "commitlint.config.mjs")
        message = Path(temporary) / "msg.txt"
        message.write_text("speckit.specify\n", encoding="utf-8")
        result = subprocess.run(
            [npm, "exec", "--", "commitlint", "--edit", str(message)],
            cwd=temporary,
            capture_output=True,
            text=True,
            check=False,
        )
    assert result.returncode != 0, result.stdout + result.stderr


@pytest.mark.parametrize(
    ("script", "variant", "name"),
    [
        ("sh", "bash", "check-commit-msg.sh"),
        ("ps", "powershell", "check-commit-msg.ps1"),
    ],
)
def test_d22_09_refresh_rewrites_commit_validators(tmp_path: Path, script: str, variant: str, name: str) -> None:
    """Fresh init and --refresh-shared-infra install the same validator bytes."""
    project = tmp_path / "proj"
    args = [
        "init", str(project),
        "--integration", "cursor-agent",
        "--stack", "cakephp2-mysql",
        "--script", script,
        "--ignore-agent-tools",
        "--skip-external-skills",
        "--non-interactive",
    ]
    result = CliRunner().invoke(app, args, catch_exceptions=False)
    assert result.exit_code == 0, result.output
    rel = Path(".specify") / "scripts" / variant / name
    original = (project / rel).read_bytes()
    manifest_path = project / ".specify" / "integrations" / "speckit.manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert rel.as_posix() in manifest["files"]
    (project / rel).write_bytes(b"# edited shared runtime\n")
    previous = os.getcwd()
    try:
        os.chdir(project)
        refreshed = CliRunner().invoke(
            app,
            ["integration", "switch", "cursor-agent", "--refresh-shared-infra"],
            catch_exceptions=False,
        )
    finally:
        os.chdir(previous)
    assert refreshed.exit_code == 0, refreshed.output
    assert (project / rel).read_bytes() == original
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["files"][rel.as_posix()] == hashlib.sha256(original).hexdigest()


def test_d22_10_symlink_extensions_still_uses_conventional_style(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A symlinked extensions directory cannot keep commit_style fixed under --stack."""
    from specify_cli.file_helper import FileHelper, UnsupportedPathError
    from specify_cli.mas import apply_mas_git_commit_style

    project = tmp_path / "proj"
    project.mkdir()
    specify = project / ".specify"
    specify.mkdir()
    shared = tmp_path / "shared-extensions"
    shared.mkdir()
    (specify / "extensions").symlink_to(shared, target_is_directory=True)
    previous = os.getcwd()
    try:
        os.chdir(project)
        result = CliRunner().invoke(
            app,
            [
                "init", "--here", "--force",
                "--integration", "cursor-agent",
                "--stack", "cakephp2-mysql",
                "--extension", "git",
                "--ignore-agent-tools",
                "--skip-external-skills",
                "--non-interactive",
                "--script", "sh",
            ],
            catch_exceptions=False,
        )
    finally:
        os.chdir(previous)
    assert result.exit_code == 0, result.output
    config = shared / "git" / "git-config.yml"
    text = config.read_text(encoding="utf-8")
    assert "commit_style: conventional" in text
    assert 'init_commit_message: "chore: initial commit"' in text
    assert "commit_style: fixed" not in text

    def reject_special(self: FileHelper, path: Path, *args: object, **kwargs: object) -> str:
        raise UnsupportedPathError("special file")

    monkeypatch.setattr(FileHelper, "read_text", reject_special)
    untouched = tmp_path / "untouched"
    untouched.mkdir()
    with pytest.raises(UnsupportedPathError):
        apply_mas_git_commit_style(untouched)


def test_d22_07_git_extension_uses_conventional_style(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        config = (project / ".specify" / "extensions" / "git" / "git-config.yml").read_text(encoding="utf-8")
        assert "commit_style: conventional" in config, stack
        assert 'init_commit_message: "chore: initial commit"' in config, stack
        assert "[Spec Kit] Initial commit" not in config, stack
