"""Deterministic NestJS stack checks shared by tests and the smoke job.

These functions encode the rules the preset tells agents to apply. They do
not invent a Node version, a package version, or an allowBuilds entry when
the input is missing or invalid.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

_PRERELEASE = re.compile(
    r"-(?:rc|beta|alpha|dev|canary|next)(?:\d|\.|$)",
    re.IGNORECASE,
)
_STABLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")

# Prisma 7.10.1 preinstall table. A higher major warns; anything else blocks.
_PRISMA7_MINORS = {20: 19, 22: 12, 24: 0}

# Packages the preset writes into pnpm-workspace.yaml.
PRESET_ALLOW_BUILDS: dict[str, bool] = {
    "prisma": True,
    "@prisma/engines": True,
    "argon2": True,
    "esbuild": True,
    "@swc/core": True,
    "msw": True,
    "@scarf/scarf": False,
}

_API_E2E = ("supertest", "postgres", "401", "403", "refresh", "429")
_MCP_E2E = ("mcp", "bearer", "scope")
_PLAYWRIGHT = ("playwright", "axe", "user story")
_UNIT = ("unit test", "guard", "casl policy")


class PolicyError(Exception):
    """A required external input is missing or unusable. No fallback value."""


def active_lts_from_index(payload: object) -> tuple[str, int]:
    """Return (exact version, major) for the first Active LTS entry.

    ``index.json`` is newest-first. ``lts: false`` entries (Current, odd,
    prerelease) are skipped. The first remaining entry is the highest Active
    LTS. A non-array, an empty list, or no Active LTS raises ``PolicyError``.
    """
    if not isinstance(payload, list):
        raise PolicyError("nodejs index.json must be a JSON array; refusing to guess a Node version")
    for entry in payload:
        if not isinstance(entry, dict) or entry.get("lts") is False:
            continue
        version = entry.get("version")
        if not isinstance(version, str) or not version.startswith("v"):
            raise PolicyError(
                f"Active LTS entry has no v-prefixed version: {entry!r}"
            )
        exact = version[1:]
        major_text = exact.split(".", 1)[0]
        if not major_text.isdigit():
            raise PolicyError(f"Active LTS version is not numeric: {exact}")
        return exact, int(major_text)
    raise PolicyError("no Active LTS in index.json; refusing to guess a Node version")


def active_lts_from_text(text: str) -> tuple[str, int]:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise PolicyError(
            f"nodejs index.json is not valid JSON ({exc}); refusing to guess a Node version"
        ) from exc
    return active_lts_from_index(payload)


def fetch_active_lts(url: str, read_text) -> tuple[str, int]:
    """Resolve Active LTS. ``read_text`` raises on network failure."""
    try:
        text = read_text(url)
    except PolicyError:
        raise
    except Exception as exc:
        raise PolicyError(
            f"failed to fetch Node.js index.json from {url}: {exc}; refusing to guess a Node version"
        ) from exc
    if not isinstance(text, str) or not text.strip():
        raise PolicyError(
            f"empty response from {url}; refusing to guess a Node version"
        )
    return active_lts_from_text(text)


def prisma7_node_disposition(major: int, minor: int = 0) -> str:
    """How Prisma 7.10.1 treats a Node version.

    ``engines.node`` is ``^20.19 || ^22.12 || >=24.0``, so majors above 24
    match engines. The CLI table only lists 20, 22, and 24: a higher major
    is ``warn`` (console.warn, process continues) and any other miss is
    ``block`` (process.exit 1).
    """
    if major in _PRISMA7_MINORS and minor >= _PRISMA7_MINORS[major]:
        return "ok"
    if major > max(_PRISMA7_MINORS):
        return "warn"
    return "block"


def is_prerelease(version: str) -> bool:
    return _PRERELEASE.search(version) is not None


def latest_stable(versions: list[str], *, major: int | None = None) -> str:
    """Highest stable ``X.Y.Z``. Prereleases are ignored, never selected."""
    best: tuple[int, int, int] | None = None
    best_text = ""
    for version in versions:
        if is_prerelease(version):
            continue
        match = _STABLE.fullmatch(version.strip())
        if match is None:
            continue
        parts = tuple(int(piece) for piece in match.groups())
        if major is not None and parts[0] != major:
            continue
        if best is None or parts > best:
            best = parts
            best_text = version.strip()
    if best is None:
        scope = f"major {major}" if major is not None else "any major"
        raise PolicyError(f"no stable version for {scope}; refusing a prerelease")
    return best_text


def install_script_decision(package: str, allow: dict[str, bool]) -> str:
    """pnpm 12: listed true runs, listed false skips, missing fails the install."""
    if package not in allow:
        return "fail"
    return "run" if allow[package] else "skip"


def init_followup_commands(*, mas_stack: bool) -> tuple[str, ...]:
    """Command names printed after init.

    MAS stacks already wrote the constitution, so it is not recommended.
    Upstream init (no ``--stack``) still lists constitution first.
    """
    commands = ("specify", "plan", "tasks", "implement", "converge")
    if mas_stack:
        return commands
    return ("constitution",) + commands


def analyze_tasks(tasks_md: str) -> list[str]:
    """Return CRITICAL finding ids missing from ``tasks.md``.

    An empty list means the mandatory test tasks are all present.
    """
    text = tasks_md.lower()
    missing: list[str] = []
    if not all(token in text for token in _API_E2E):
        missing.append("api-e2e")
    if not all(token in text for token in _MCP_E2E):
        missing.append("mcp-e2e")
    if not all(token in text for token in _PLAYWRIGHT):
        missing.append("playwright")
    if not all(token in text for token in _UNIT):
        missing.append("unit")
    return missing


def feature_branch_status(*, head: str, feature_directory: str | None) -> str:
    """plan/tasks/implement gate. ``main`` or a mismatched directory is HARD_FAIL."""
    if not feature_directory:
        return "HARD_FAIL"
    expected = Path(feature_directory).name
    if head in {"main", "master"} or head != expected:
        return "HARD_FAIL"
    return "PASS"


def specify_may_continue(*, script_exit_code: int) -> bool:
    """A failed create-new-feature script stops specify. No hand-written spec."""
    return script_exit_code == 0
