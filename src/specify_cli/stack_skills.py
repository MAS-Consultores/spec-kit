"""Install external agent skills during MAS stack-aware initialization."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable

import yaml

from ._assets import _locate_bundled_preset
from .mas import MAS_CORE_PRESET_ID

if TYPE_CHECKING:
    from .integrations.base import IntegrationBase
    from .mas import MasStack

STACK_SKILLS_FILENAME = "stack-skills.yml"
STACK_SKILLS_LEGACY_FILENAME = "stack-skill.yml"
EXTERNAL_SKILLS_STATUS_FILE = ".specify/external-skills-status.json"
EXTERNAL_SKILLS_LOG_DIR = ".specify/logs"
DEFAULT_INSTALL_TIMEOUT = 300
MAX_FAILURE_REASON_CHARS = 2000
LOG_TAIL_LINES = 40

# Spec Kit integration key -> skills CLI --agent value
INTEGRATION_TO_SKILLS_AGENT: dict[str, str] = {
    "codex": "codex",
    "claude": "claude-code",
    "cursor-agent": "cursor",
    "copilot": "github-copilot",
    "kimi": "kimi-cli",
    "opencode": "opencode",
    "amp": "amp",
    "replit": "replit",
    "universal": "universal",
    "gemini": "gemini-cli",
    "devin": "devin",
    "trae": "trae",
    "trae-cn": "trae-cn",
    "vibe": "mistral-vibe",
    "agy": "agy",
    "windsurf": "windsurf",
    "goose": "goose",
    "qwen": "qwen-code",
    "roo": "roo",
    "kilocode": "kilo",
    "kiro-cli": "kiro-cli",
    "iflow": "iflow-cli",
    "codebuddy": "codebuddy",
    "cline": "cline",
    "auggie": "augment",
    "forge": "forgecode",
    "pi": "pi",
    "qodercli": "qoder",
    "tabnine": "tabnine-cli",
    "bob": "bob",
    "junie": "junie",
    "shai": "shai",
    "lingma": "lingma",
}

# skills CLI project paths per agent (canonical install location)
SKILLS_AGENT_PROJECT_DIRS: dict[str, str] = {
    "codex": ".agents/skills",
    "claude-code": ".claude/skills",
    "cursor": ".agents/skills",
    "github-copilot": ".agents/skills",
    "kimi-cli": ".kimi/skills",
    "opencode": ".agents/skills",
    "amp": ".agents/skills",
    "replit": ".agents/skills",
    "universal": ".agents/skills",
    "gemini-cli": ".agents/skills",
    "devin": ".devin/skills",
    "trae": ".trae/skills",
    "trae-cn": ".trae/skills",
    "mistral-vibe": ".vibe/skills",
    "windsurf": ".windsurf/skills",
    "goose": ".goose/skills",
    "qwen-code": ".qwen/skills",
    "roo": ".roo/skills",
    "kilo": ".kilocode/skills",
    "kiro-cli": ".kiro/skills",
    "iflow-cli": ".iflow/skills",
    "codebuddy": ".codebuddy/skills",
    "cline": ".agents/skills",
    "augment": ".augment/skills",
    "forgecode": ".forge/skills",
    "pi": ".pi/skills",
    "qoder": ".qoder/skills",
    "tabnine-cli": ".tabnine/agent/skills",
    "bob": ".bob/skills",
    "junie": ".junie/skills",
}


@dataclass(frozen=True)
class ExternalSkillSpec:
    """A skill to install from the skills.sh ecosystem."""

    source: str
    skill: str
    agents: tuple[str, ...] = ()

    def dedupe_key(self) -> tuple[str, str]:
        return (self.source.strip(), self.skill.strip())


@dataclass(frozen=True)
class ExternalSkillResult:
    """Outcome of attempting to install one external skill."""

    source: str
    skill: str
    status: str  # installed | skipped | failed
    reason: str = ""
    command: str = ""


def _stack_skills_manifest_path(preset_dir: Path) -> Path | None:
    """Return the stack skills manifest path, including legacy filename."""
    primary = preset_dir / STACK_SKILLS_FILENAME
    if primary.is_file():
        return primary
    legacy = preset_dir / STACK_SKILLS_LEGACY_FILENAME
    if legacy.is_file():
        return legacy
    return None


def load_stack_skill_manifest(preset_dir: Path) -> list[ExternalSkillSpec]:
    """Load external skill specs from a preset's stack-skills.yml."""
    manifest_path = _stack_skills_manifest_path(preset_dir)
    if manifest_path is None:
        return []

    try:
        data = yaml.safe_load(manifest_path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError:
        return []

    if not isinstance(data, dict):
        return []

    raw_skills = data.get("skills")
    if not isinstance(raw_skills, list):
        return []

    specs: list[ExternalSkillSpec] = []
    for entry in raw_skills:
        if not isinstance(entry, dict):
            continue
        source = entry.get("source")
        skill = entry.get("skill")
        if not isinstance(source, str) or not source.strip():
            continue
        if not isinstance(skill, str) or not skill.strip():
            continue
        agents: tuple[str, ...] = ()
        raw_agents = entry.get("agents")
        if isinstance(raw_agents, list):
            agents = tuple(
                str(a).strip()
                for a in raw_agents
                if isinstance(a, str) and str(a).strip()
            )
        specs.append(
            ExternalSkillSpec(
                source=source.strip(),
                skill=skill.strip(),
                agents=agents,
            )
        )
    return specs


def resolve_stack_external_skills(mas_stack: MasStack) -> list[ExternalSkillSpec]:
    """Merge stack-skills manifests from mas-core and the selected stack preset."""
    seen: set[tuple[str, str]] = set()
    merged: list[ExternalSkillSpec] = []

    for preset_id in (MAS_CORE_PRESET_ID, mas_stack.stack_preset_id):
        bundled = _locate_bundled_preset(preset_id)
        if bundled is None:
            continue
        for spec in load_stack_skill_manifest(bundled):
            key = spec.dedupe_key()
            if key in seen:
                continue
            seen.add(key)
            merged.append(spec)

    return merged


def integration_to_skills_agent(integration_key: str) -> str | None:
    """Return the skills CLI agent id for a Spec Kit integration key."""
    return INTEGRATION_TO_SKILLS_AGENT.get(integration_key)


def integration_supports_external_skills(
    integration: IntegrationBase,
    *,
    ai_skills: bool = False,
) -> bool:
    """Return True when external skills should be installed for this integration."""
    from .integrations.base import SkillsIntegration

    if isinstance(integration, SkillsIntegration):
        return True
    if getattr(integration, "_skills_mode", False):
        return True
    if integration.key == "kimi":
        return True
    if integration.key == "copilot" and ai_skills:
        return True
    return False


def _resolve_npx_executable() -> str | None:
    """Return the absolute path to npx on PATH, or None if unavailable."""
    return shutil.which("npx")


def build_skills_add_command(
    spec: ExternalSkillSpec,
    *,
    skills_agent: str,
    npx_executable: str | None = None,
) -> list[str]:
    """Build argv for a non-interactive project-scoped skills install."""
    agents = list(spec.agents) if spec.agents else [skills_agent]
    npx = (
        npx_executable
        if npx_executable is not None
        else (_resolve_npx_executable() or "npx")
    )
    cmd = [
        npx,
        "--yes",
        "skills",
        "add",
        spec.source,
        "--skill",
        spec.skill,
        "-y",
        "--copy",
    ]
    for agent in agents:
        cmd.extend(["-a", agent])
    return cmd


def _is_speckit_skill_dir(name: str) -> bool:
    return name.startswith("speckit-") or name.startswith("speckit.")


def _read_skill_name(skill_dir: Path) -> str | None:
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.is_file():
        return None
    content = skill_file.read_text(encoding="utf-8", errors="replace")
    if not content.startswith("---"):
        return skill_dir.name
    parts = content.split("---", 2)
    if len(parts) < 3:
        return skill_dir.name
    try:
        fm = yaml.safe_load(parts[1]) or {}
    except yaml.YAMLError:
        return skill_dir.name
    if isinstance(fm, dict):
        name = fm.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
    return skill_dir.name


def _iter_external_skill_dirs(skills_root: Path) -> list[Path]:
    if not skills_root.is_dir():
        return []
    dirs: list[Path] = []
    for child in sorted(skills_root.iterdir()):
        if not child.is_dir():
            continue
        if not (child / "SKILL.md").is_file():
            continue
        name = _read_skill_name(child) or child.name
        if _is_speckit_skill_dir(name) or _is_speckit_skill_dir(child.name):
            continue
        dirs.append(child)
    return dirs


def sync_skills_to_integration_dir(
    project_root: Path,
    *,
    skills_agent: str,
    integration_skills_dir: Path,
    skill_names: tuple[str, ...],
) -> None:
    """Copy external skills from the skills CLI install path to the integration folder."""
    canonical_rel = SKILLS_AGENT_PROJECT_DIRS.get(skills_agent, ".agents/skills")
    canonical = (project_root / canonical_rel).resolve()
    target = integration_skills_dir.resolve()

    if canonical == target:
        return

    for skill_name in skill_names:
        src = canonical / skill_name
        if not src.is_dir():
            # Also try directory name matching spec.skill directly
            for candidate in _iter_external_skill_dirs(canonical):
                if candidate.name == skill_name or _read_skill_name(candidate) == skill_name:
                    src = candidate
                    break
        if not src.is_dir():
            continue

        dest = target / src.name
        if dest.exists():
            if _is_speckit_skill_dir(dest.name):
                continue
            shutil.rmtree(dest)
        shutil.copytree(src, dest)


def _npx_available() -> bool:
    return _resolve_npx_executable() is not None


def _skills_subprocess_kwargs() -> dict[str, Any]:
    """Keyword args for capturing npx/skills CLI output cross-platform."""
    return {
        "capture_output": True,
        "text": True,
        "encoding": "utf-8",
        "errors": "replace",
        "check": False,
        "env": _skills_subprocess_env(),
    }


def _skills_subprocess_env() -> dict[str, str]:
    """Build subprocess env so private git repos fail fast instead of hanging."""
    env = os.environ.copy()
    # Prevent git from blocking on interactive credential prompts.
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GCM_INTERACTIVE"] = "Never"
    # Forward GitHub tokens commonly used for private repo access.
    for token_var in ("GITHUB_TOKEN", "GH_TOKEN", "GITHUB_ENTERPRISE_TOKEN"):
        if token_var in os.environ and os.environ[token_var].strip():
            env.setdefault("GH_TOKEN", os.environ[token_var].strip())
            break
    return _inject_gh_token_from_cli(env)


def _inject_gh_token_from_cli(env: dict[str, str]) -> dict[str, str]:
    """Use `gh auth token` when GH_TOKEN is not already exported."""
    if env.get("GH_TOKEN", "").strip() or env.get("GITHUB_TOKEN", "").strip():
        return env
    gh = shutil.which("gh")
    if gh is None:
        return env
    try:
        result = subprocess.run(
            [gh, "auth", "token"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError):
        return env
    token = (result.stdout or "").strip()
    if result.returncode == 0 and token:
        env["GH_TOKEN"] = token
        # skills/git may read either variable depending on host tooling.
        env.setdefault("GITHUB_TOKEN", token)
    return env


def _read_log_tail(log_path: Path, *, max_lines: int = LOG_TAIL_LINES) -> str:
    if not log_path.is_file():
        return ""
    try:
        lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return ""
    if not lines:
        return ""
    return "\n".join(lines[-max_lines:])


def _external_skill_log_path(project_root: Path, skill_name: str) -> Path:
    safe_name = re.sub(r"[^\w.-]+", "-", skill_name).strip("-") or "skill"
    return project_root / EXTERNAL_SKILLS_LOG_DIR / f"external-skill-{safe_name}.log"


def _shell_join(argv: list[str]) -> str:
    """Render argv as a copy-pastable shell command."""
    parts: list[str] = []
    for arg in argv:
        if re.search(r"\s|\"|'|&", arg):
            escaped = arg.replace('"', '\\"')
            parts.append(f'"{escaped}"')
        else:
            parts.append(arg)
    return " ".join(parts)


def _hint_for_private_repo_failure(detail: str) -> str:
    """Return a short hint when failure looks like private-repo auth."""
    lower = detail.lower()
    auth_markers = (
        "authentication failed",
        "could not read username",
        "permission denied",
        "repository not found",
        "404",
        "401",
        "403",
        "auth",
        "denied",
        "terminal prompts disabled",
        "git_terminal_prompt",
    )
    if any(marker in lower for marker in auth_markers):
        return (
            "Private GitHub repos require credentials. Set GH_TOKEN or GITHUB_TOKEN, "
            "use an SSH source (git@github.com:org/repo.git), or run "
            "'gh auth login' / 'git credential' before specify init."
        )
    return ""


def format_skills_cli_failure(
    spec: ExternalSkillSpec,
    cmd: list[str],
    *,
    returncode: int | None = None,
    stdout: str = "",
    stderr: str = "",
    timeout_message: str = "",
    log_path: Path | None = None,
) -> str:
    """Build a user-visible failure message for a skills CLI install attempt."""
    lines = [
        f"skill: {spec.skill}",
        f"source: {spec.source}",
        f"command: {_shell_join(cmd)}",
    ]
    if log_path is not None:
        lines.append(f"log: {log_path.as_posix()}")
    if timeout_message:
        lines.append(f"error: {timeout_message}")
    elif returncode is not None:
        lines.append(f"exit code: {returncode}")

    combined = "\n".join(
        part.strip()
        for part in (stderr.strip(), stdout.strip())
        if part.strip()
    )
    if not combined and log_path is not None:
        combined = _read_log_tail(log_path)
    if combined:
        lines.append("output:")
        lines.append(combined)

    hint = _hint_for_private_repo_failure(combined or timeout_message)
    if hint:
        lines.append(f"hint: {hint}")

    message = "\n".join(lines)
    if len(message) > MAX_FAILURE_REASON_CHARS:
        return message[: MAX_FAILURE_REASON_CHARS - 3] + "..."
    return message


def _run_skills_add(
    project_root: Path,
    spec: ExternalSkillSpec,
    *,
    skills_agent: str,
    timeout: int,
    runner: Callable[..., subprocess.CompletedProcess[str]] | None = None,
) -> tuple[bool, str, str]:
    """Run npx skills add. Returns (ok, reason, command_string)."""
    run = runner or subprocess.run
    npx = _resolve_npx_executable()
    if npx is None:
        return False, "npx_not_available", ""
    cmd = build_skills_add_command(
        spec, skills_agent=skills_agent, npx_executable=npx
    )
    command_str = _shell_join(cmd)
    log_path = _external_skill_log_path(project_root, spec.skill)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    env = _skills_subprocess_env()
    try:
        with log_path.open("w", encoding="utf-8") as log_file:
            log_file.write(f"command: {command_str}\n\n")
            log_file.flush()
            result = run(
                cmd,
                cwd=str(project_root),
                timeout=timeout,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=False,
                env=env,
            )
    except subprocess.TimeoutExpired:
        reason = format_skills_cli_failure(
            spec,
            cmd,
            timeout_message=(
                f"timed out after {timeout}s installing '{spec.skill}'. "
                "Check the log file for progress; private repos may need GH_TOKEN."
            ),
            log_path=log_path,
        )
        return False, reason, command_str
    except OSError as exc:
        reason = format_skills_cli_failure(
            spec, cmd, timeout_message=str(exc), log_path=log_path
        )
        return False, reason, command_str

    if result.returncode != 0:
        reason = format_skills_cli_failure(
            spec,
            cmd,
            returncode=result.returncode,
            log_path=log_path,
        )
        return False, reason, command_str
    return True, "", command_str


def pending_external_skills_payload(
    specs: list[ExternalSkillSpec],
) -> list[dict[str, str]]:
    """Build init-options payload before any install attempt."""
    return [
        {
            "source": s.source,
            "skill": s.skill,
            "status": "pending",
            "reason": "",
        }
        for s in specs
    ]


def write_external_skills_status(
    project_root: Path,
    payload: list[dict[str, str]],
) -> None:
    """Persist live external-skills progress for debugging interrupted inits."""
    dest = project_root / EXTERNAL_SKILLS_STATUS_FILE
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def install_stack_external_skills(
    project_root: Path,
    mas_stack: MasStack,
    integration: IntegrationBase,
    *,
    selected_ai: str,
    ai_skills: bool = False,
    skip: bool = False,
    strict: bool = False,
    timeout: int = DEFAULT_INSTALL_TIMEOUT,
    get_skills_dir: Callable[[Path, str], Path] | None = None,
    runner: Callable[..., subprocess.CompletedProcess[str]] | None = None,
    progress_callback: Callable[[list[ExternalSkillResult]], None] | None = None,
) -> list[ExternalSkillResult]:
    """Install bundled external skills for a MAS stack-aware project.

    Returns a list of per-skill results for persistence in init-options.json.
    """
    specs = resolve_stack_external_skills(mas_stack)
    if skip:
        return [
            ExternalSkillResult(
                source=s.source,
                skill=s.skill,
                status="skipped",
                reason="--skip-external-skills",
            )
            for s in specs
        ]

    if not specs:
        return []

    if not integration_supports_external_skills(integration, ai_skills=ai_skills):
        return [
            ExternalSkillResult(
                source=s.source,
                skill=s.skill,
                status="skipped",
                reason="not_skills_integration",
            )
            for s in specs
        ]

    skills_agent = integration_to_skills_agent(integration.key)
    if skills_agent is None:
        return [
            ExternalSkillResult(
                source=s.source,
                skill=s.skill,
                status="skipped",
                reason=f"no_skills_agent_mapping_for_{integration.key}",
            )
            for s in specs
        ]

    if not _npx_available():
        results = [
            ExternalSkillResult(
                source=s.source,
                skill=s.skill,
                status="failed",
                reason="npx_not_available",
            )
            for s in specs
        ]
        if strict:
            raise RuntimeError(
                "External skills installation requires npx on PATH. "
                "Install Node.js or use --skip-external-skills."
            )
        return results

    if get_skills_dir is None:
        from . import _get_skills_dir as _default_get_skills_dir

        get_skills_dir = _default_get_skills_dir

    integration_skills_dir = get_skills_dir(project_root, selected_ai)
    total = len(specs)
    results: list[ExternalSkillResult] = [
        ExternalSkillResult(
            source=spec.source,
            skill=spec.skill,
            status="pending",
        )
        for spec in specs
    ]
    installed_names: list[str] = []

    def _notify() -> None:
        if progress_callback is not None:
            progress_callback(list(results))

    _notify()

    for index, spec in enumerate(specs):
        results[index] = ExternalSkillResult(
            source=spec.source,
            skill=spec.skill,
            status="installing",
            reason=f"Installing ({index + 1}/{total})",
        )
        _notify()

        ok, reason, command_str = _run_skills_add(
            project_root,
            spec,
            skills_agent=skills_agent,
            timeout=timeout,
            runner=runner,
        )
        if ok:
            results[index] = ExternalSkillResult(
                source=spec.source,
                skill=spec.skill,
                status="installed",
                command=command_str,
            )
            installed_names.append(spec.skill)
        else:
            results[index] = ExternalSkillResult(
                source=spec.source,
                skill=spec.skill,
                status="failed",
                reason=reason,
                command=command_str,
            )
            if strict:
                _notify()
                raise RuntimeError(
                    f"Failed to install external skill '{spec.skill}' "
                    f"from {spec.source}.\n{reason}"
                )
        _notify()

    if installed_names:
        sync_skills_to_integration_dir(
            project_root,
            skills_agent=skills_agent,
            integration_skills_dir=integration_skills_dir,
            skill_names=tuple(installed_names),
        )

    return results


def external_skills_to_init_payload(
    results: list[ExternalSkillResult],
) -> list[dict[str, str]]:
    """Serialize install results for init-options.json."""
    payload: list[dict[str, str]] = []
    for r in results:
        entry: dict[str, str] = {
            "source": r.source,
            "skill": r.skill,
            "status": r.status,
            "reason": r.reason,
        }
        if r.command:
            entry["command"] = r.command
        payload.append(entry)
    return payload


def render_external_skills_failure_panel(results: list[ExternalSkillResult]) -> str:
    """Build Rich-friendly text for failed external skill installs."""
    failed = [r for r in results if r.status == "failed"]
    if not failed:
        return ""

    blocks: list[str] = []
    for idx, item in enumerate(failed, start=1):
        blocks.append(f"[bold]{idx}. {item.skill}[/bold] ({item.source})")
        if item.command:
            blocks.append(f"   [dim]command:[/dim] {item.command}")
        log_path = _external_skill_log_path(Path("."), item.skill)
        blocks.append(f"   [dim]log:[/dim] {EXTERNAL_SKILLS_LOG_DIR}/{log_path.name}")
        if item.reason:
            for line in item.reason.splitlines():
                blocks.append(f"   {line}")
        blocks.append("")
    return "\n".join(blocks).rstrip()


def render_external_skills_summary_panel(results: list[ExternalSkillResult]) -> str:
    """Build a post-init summary for all external skill outcomes."""
    if not results:
        return ""

    lines: list[str] = []
    for item in results:
        if item.status == "installed":
            marker = "[green]installed[/green]"
        elif item.status == "failed":
            marker = "[red]failed[/red]"
        elif item.status == "skipped":
            marker = "[yellow]skipped[/yellow]"
        elif item.status in ("pending", "installing"):
            marker = f"[yellow]{item.status}[/yellow]"
        else:
            marker = item.status
        lines.append(f"  {marker}  {item.skill} ({item.source})")
        if item.status == "failed":
            log_name = _external_skill_log_path(Path("."), item.skill).name
            lines.append(f"         [dim]log: {EXTERNAL_SKILLS_LOG_DIR}/{log_name}[/dim]")
    return "\n".join(lines)
