"""Shared test helpers for the Spec Kit test suite."""

import os
import re
import shlex
import shutil
import subprocess
import sys
from contextvars import ContextVar
from pathlib import Path

import pytest
import yaml

from specify_cli.presets import PresetRegistry

_ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")


def _has_working_bash() -> bool:
    """Check whether a functional native bash is available.

    On Windows, ``subprocess.run(["bash", ...])`` uses CreateProcess,
    which searches System32 *before* PATH — so it may find the WSL
    launcher even when Git-for-Windows bash appears first in PATH via
    ``shutil.which``.  We therefore probe with bare ``"bash"`` (the
    same way test helpers invoke it) to get an accurate result.

    On Windows, only Git-for-Windows bash (MSYS2/MINGW) is accepted.
    The WSL launcher is rejected because it runs in a separate Linux
    filesystem and cannot handle native Windows paths used by the
    test fixtures.

    Set SPECKIT_TEST_BASH=1 to force-enable bash tests regardless.
    """
    if os.environ.get("SPECKIT_TEST_BASH") == "1":
        return True
    if shutil.which("bash") is None:
        return False
    # Probe with bare "bash" — same as the test helpers — so that
    # Windows CreateProcess resolution order is respected.
    try:
        r = subprocess.run(
            ["bash", "-c", "echo ok"],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode != 0 or "ok" not in r.stdout:
            return False
    except (OSError, subprocess.TimeoutExpired):
        return False
    # On Windows, verify we have MSYS/MINGW bash (Git for Windows),
    # not the WSL launcher which can't handle native paths.
    if sys.platform == "win32":
        try:
            u = subprocess.run(
                ["bash", "-c", "uname -s"],
                capture_output=True, text=True, timeout=5,
            )
            kernel = u.stdout.strip().upper()
            if not any(k in kernel for k in ("MSYS", "MINGW", "CYGWIN")):
                return False
        except (OSError, subprocess.TimeoutExpired):
            return False
    return True


HAS_BASH = _has_working_bash()

requires_bash = pytest.mark.skipif(
    not HAS_BASH, reason="working bash not available"
)


def install_preset(
    project_root: Path, pack_id: str, provides: dict, priority: int = 10
) -> Path:
    """Create a registered preset with a validated modern manifest."""
    pack_dir = project_root / ".specify" / "presets" / pack_id
    pack_dir.mkdir(parents=True)
    templates: list[dict[str, str]] = []

    def _default_file(kind: str, name: str) -> str:
        if kind == "command":
            return f"commands/{name}.md"
        if kind == "script":
            return f"scripts/{name}.sh"
        return f"templates/{name}.md"

    for entry in provides.get("templates", []):
        if not isinstance(entry, dict):
            continue
        entry_type = entry.get("type", "template")
        if not isinstance(entry_type, str) or entry_type not in (
            "command",
            "template",
            "script",
        ):
            continue
        name = entry.get("name")
        if not isinstance(name, str):
            continue
        normalized = dict(entry)
        normalized["type"] = entry_type
        normalized.setdefault("file", _default_file(entry_type, name))
        templates.append(normalized)

    for kind_key, entry_type in (("commands", "command"), ("scripts", "script")):
        for entry in provides.get(kind_key, []):
            if not isinstance(entry, dict):
                continue
            name = entry.get("name")
            if not isinstance(name, str):
                continue
            normalized = dict(entry)
            normalized["type"] = entry_type
            normalized.setdefault("file", _default_file(entry_type, name))
            templates.append(normalized)

    manifest = {
        "schema_version": "1.0",
        "preset": {
            "id": pack_id,
            "name": f"Test preset {pack_id}",
            "version": "1.0.0",
            "description": f"Test preset {pack_id}",
        },
        "requires": {"speckit_version": ">=1.0.0"},
        "provides": {"templates": templates},
    }
    (pack_dir / "preset.yml").write_text(yaml.safe_dump(manifest), encoding="utf-8")
    PresetRegistry(project_root / ".specify" / "presets").add(
        pack_id, {"priority": priority, "version": "1.0.0"}
    )
    return pack_dir


def strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from Rich-formatted CLI output."""
    return _ANSI_ESCAPE_RE.sub("", text)


# ---------------------------------------------------------------------------
# Auth config isolation — prevents tests from reading ~/.specify/auth.json
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _isolate_auth_config(monkeypatch):
    """Ensure no test reads the real ~/.specify/auth.json."""
    from specify_cli.authentication import http as _auth_http
    monkeypatch.setattr(_auth_http, "_config_override", [])
    # Also clear the per-process cache so tests that unset _config_override
    # won't see a previously cached real-file result.
    monkeypatch.setattr(_auth_http, "_config_cache", None)


# Stack shipped on MAS main. Upstream tests call ``specify init`` without
# ``--stack``; the fork rejects that. Injection is test-only and does not
# change the CLI. Tests that assert the missing-stack rejection opt out.
UPSTREAM_INIT_STACK = "cakephp2-mysql"
# Files a stack-aware init adds on top of the upstream project tree when the
# suite supplies ``cakephp2-mysql``. Inventory tests append this list.
MAS_INIT_EXTRA_FILES = [
    ".gitignore",
    ".specify/memory/language-policy.md",
    ".specify/memory/security-guidelines.md",
    ".specify/memory/stack-context.md",
    ".specify/memory/stack.md",
    ".specify/presets/.registry",
    ".specify/presets/mas-core/.composed/speckit.checklist.md",
    ".specify/presets/mas-core/.composed/speckit.clarify.md",
    ".specify/presets/mas-core/.composed/speckit.implement.md",
    ".specify/presets/mas-core/.composed/speckit.plan.md",
    ".specify/presets/mas-core/.composed/speckit.specify.md",
    ".specify/presets/mas-core/.composed/speckit.tasks.md",
    ".specify/presets/mas-core/commands/speckit.checklist.md",
    ".specify/presets/mas-core/commands/speckit.clarify.md",
    ".specify/presets/mas-core/commands/speckit.implement.md",
    ".specify/presets/mas-core/commands/speckit.plan.md",
    ".specify/presets/mas-core/commands/speckit.specify.md",
    ".specify/presets/mas-core/commands/speckit.tasks.md",
    ".specify/presets/mas-core/preset.yml",
    ".specify/presets/mas-core/stack-skills.yml",
    ".specify/presets/mas-core/templates/constitution-template.md",
    ".specify/presets/mas-core/templates/plan-template.md",
    ".specify/presets/mas-core/templates/spec-template-append.md",
    ".specify/presets/mas-core/templates/tasks-template.md",
    ".specify/presets/mas-stack-cakephp2-mysql/preset.yml",
    ".specify/presets/mas-stack-cakephp2-mysql/stack-skills.yml",
    ".specify/presets/mas-stack-cakephp2-mysql/templates/mas-stack-cakephp2-mysql.md",
]


def mas_init_extra_files(script: str) -> list[str]:
    """Stack files plus the branch scripts for the selected script flavor."""
    branch_scripts = {
        "sh": [
            ".specify/scripts/bash/ensure-feature-branch.sh",
            ".specify/scripts/bash/finish-feature.sh",
        ],
        "ps": [
            ".specify/scripts/powershell/ensure-feature-branch.ps1",
            ".specify/scripts/powershell/finish-feature.ps1",
        ],
    }
    return [*MAS_INIT_EXTRA_FILES, *branch_scripts[script]]
_SKIP_DEFAULT_STACK_TESTS = frozenset({
    "test_init_rejects_missing_stack_before_side_effects",
    "test_missing_or_invalid_stack_fails_before_creating_project",
    "test_missing_stack_still_fails_before_writing",
})
_INJECT_UPSTREAM_INIT_STACK: ContextVar[bool] = ContextVar(
    "inject_upstream_init_stack", default=True
)


def _with_upstream_init_stack(args):
    """Return ``args`` with a valid MAS ``--stack`` when ``init`` omitted one.

    ``--preset`` is left untouched: the fork treats it as mutually exclusive
    with ``--stack``. ``--help`` is left untouched so help snapshots stay stable.
    """
    if args is None:
        return args
    as_string = isinstance(args, str)
    try:
        tokens = shlex.split(args) if as_string else list(args)
    except (TypeError, ValueError):
        return args
    if not tokens or tokens[0] != "init":
        return args
    if "--help" in tokens or "-h" in tokens:
        return args
    if "--stack" not in tokens and "--preset" not in tokens:
        tokens = [tokens[0], "--stack", UPSTREAM_INIT_STACK, *tokens[1:]]
    # Upstream init does not opt out of stack skill installs. When npx is on
    # PATH those installs reach the network and do not exercise the assertion.
    # Tests of the skill installer keep the real flag.
    if "--skip-external-skills" not in tokens and "--preset" not in tokens:
        tokens = [*tokens, "--skip-external-skills"]
    injected = tokens
    if as_string:
        return shlex.join(injected)
    if isinstance(args, tuple):
        return tuple(injected)
    return injected


@pytest.fixture(scope="session", autouse=True)
def _supply_stack_to_upstream_init():
    """Give upstream ``specify init`` invocations a stack from main.

    The patch is session-scoped so module-scoped project templates, which
    initialize before function fixtures, receive it too. MAS tests that
    already pass ``--stack`` are unchanged. Tests that assert the missing
    stack, or that install external skills, turn injection off.
    """
    from typer.testing import CliRunner

    original = CliRunner.invoke

    def invoke(self, cli, args=None, *invoke_args, **invoke_kwargs):
        if _INJECT_UPSTREAM_INIT_STACK.get():
            args = _with_upstream_init_stack(args)
        return original(self, cli, args, *invoke_args, **invoke_kwargs)

    CliRunner.invoke = invoke
    yield
    CliRunner.invoke = original


@pytest.fixture(autouse=True)
def _skip_upstream_init_stack_injection(request):
    if request.node.originalname in _SKIP_DEFAULT_STACK_TESTS:
        token = _INJECT_UPSTREAM_INIT_STACK.set(False)
        yield
        _INJECT_UPSTREAM_INIT_STACK.reset(token)
        return
    if getattr(request.node, "path", None) and request.node.path.name == "test_stack_external_skills.py":
        token = _INJECT_UPSTREAM_INIT_STACK.set(False)
        yield
        _INJECT_UPSTREAM_INIT_STACK.reset(token)
        return
    yield


@pytest.fixture(autouse=True)
def _strip_specify_env(monkeypatch):
    """Drop any inherited SPECIFY_* vars for every test.

    The Python CLI's project resolver (`_require_specify_project`) now honors
    SPECIFY_INIT_DIR, and the shell resolvers honor SPECIFY_FEATURE* — so a
    developer or CI runner with any SPECIFY_* var exported would silently
    retarget (or hard-error) the many command/script tests that resolve a
    project. Stripping them here keeps resolution tests deterministic; a test
    that wants an override sets it explicitly via monkeypatch afterwards."""
    for key in [k for k in os.environ if k.startswith("SPECIFY_")]:
        monkeypatch.delenv(key, raising=False)
    for key in list(os.environ):
        if key.startswith("SPECKIT_INTEGRATION_") and (
            key.endswith("_EXTRA_ARGS") or key.endswith("_EXECUTABLE")
        ):
            monkeypatch.delenv(key, raising=False)


@pytest.fixture
def clean_environ(monkeypatch):
    """Strip any real GH_TOKEN / GITHUB_TOKEN from the test environment."""
    monkeypatch.delenv("GH_TOKEN", raising=False)
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)


def _fake_self_upgrade_argv0(monkeypatch, tmp_path, env_name, path_parts):
    """Create a fake executable under tmp_path and point sys.argv[0] at it."""
    monkeypatch.setenv(env_name, str(tmp_path))
    fake_dir = tmp_path.joinpath(*path_parts)
    fake_dir.mkdir(parents=True)
    fake_specify = fake_dir / ("specify.exe" if os.name == "nt" else "specify")
    fake_specify.write_text("#!/usr/bin/env python\n")
    fake_specify.chmod(0o755)
    monkeypatch.setattr("sys.argv", [str(fake_specify)])
    return fake_specify


@pytest.fixture
def uv_tool_argv0(monkeypatch, tmp_path):
    """Point sys.argv[0] at a simulated `uv tool` install path under tmp HOME."""
    if os.name == "nt":
        return _fake_self_upgrade_argv0(
            monkeypatch, tmp_path, "LOCALAPPDATA", ("uv", "tools", "specify-cli", "bin")
        )
    return _fake_self_upgrade_argv0(
        monkeypatch,
        tmp_path,
        "HOME",
        (".local", "share", "uv", "tools", "specify-cli", "bin"),
    )


@pytest.fixture
def pipx_argv0(monkeypatch, tmp_path):
    """Point sys.argv[0] at a simulated pipx install path under tmp HOME."""
    if os.name == "nt":
        return _fake_self_upgrade_argv0(
            monkeypatch, tmp_path, "LOCALAPPDATA", ("pipx", "venvs", "specify-cli", "bin")
        )
    return _fake_self_upgrade_argv0(
        monkeypatch, tmp_path, "HOME", (".local", "pipx", "venvs", "specify-cli", "bin")
    )


@pytest.fixture
def uvx_ephemeral_argv0(monkeypatch, tmp_path):
    """Point sys.argv[0] at a simulated uvx ephemeral-cache path under tmp HOME."""
    if os.name == "nt":
        return _fake_self_upgrade_argv0(
            monkeypatch,
            tmp_path,
            "LOCALAPPDATA",
            ("uv", "cache", "archive-v0", "abc123", "bin"),
        )
    return _fake_self_upgrade_argv0(
        monkeypatch, tmp_path, "HOME", (".cache", "uv", "archive-v0", "abc123", "bin")
    )


@pytest.fixture
def unsupported_argv0(monkeypatch, tmp_path):
    """Point sys.argv[0] at a path that does not match any installer prefix."""
    return _fake_self_upgrade_argv0(
        monkeypatch, tmp_path, "HOME", ("random", "location", "bin")
    )
