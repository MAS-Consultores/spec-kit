"""Install external agent skills during MAS stack-aware initialization."""

from __future__ import annotations

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
DEFAULT_INSTALL_TIMEOUT = 120

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


def load_stack_skill_manifest(preset_dir: Path) -> list[ExternalSkillSpec]:
    """Load external skill specs from a preset's stack-skills.yml."""
    manifest_path = preset_dir / STACK_SKILLS_FILENAME
    if not manifest_path.is_file():
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


def build_skills_add_command(
    spec: ExternalSkillSpec,
    *,
    skills_agent: str,
) -> list[str]:
    """Build argv for a non-interactive project-scoped skills install."""
    agents = list(spec.agents) if spec.agents else [skills_agent]
    cmd = [
        "npx",
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
    return shutil.which("npx") is not None


def _run_skills_add(
    project_root: Path,
    spec: ExternalSkillSpec,
    *,
    skills_agent: str,
    timeout: int,
    runner: Callable[..., subprocess.CompletedProcess[str]] | None = None,
) -> tuple[bool, str]:
    run = runner or subprocess.run
    cmd = build_skills_add_command(spec, skills_agent=skills_agent)
    try:
        result = run(
            cmd,
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return False, f"timed out after {timeout}s"
    except OSError as exc:
        return False, str(exc)

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        detail = stderr or stdout or f"exit code {result.returncode}"
        return False, detail[:500]
    return True, ""


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
    results: list[ExternalSkillResult] = []
    installed_names: list[str] = []

    for spec in specs:
        ok, reason = _run_skills_add(
            project_root,
            spec,
            skills_agent=skills_agent,
            timeout=timeout,
            runner=runner,
        )
        if ok:
            results.append(
                ExternalSkillResult(
                    source=spec.source,
                    skill=spec.skill,
                    status="installed",
                )
            )
            installed_names.append(spec.skill)
        else:
            results.append(
                ExternalSkillResult(
                    source=spec.source,
                    skill=spec.skill,
                    status="failed",
                    reason=reason,
                )
            )
            if strict:
                raise RuntimeError(
                    f"Failed to install external skill '{spec.skill}' "
                    f"from {spec.source}: {reason}"
                )

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
    return [
        {
            "source": r.source,
            "skill": r.skill,
            "status": r.status,
            "reason": r.reason,
        }
        for r in results
    ]
