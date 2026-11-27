"""Agent configuration constants derived from the integration registry."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any


def _build_agent_config() -> dict[str, dict[str, Any]]:
    from .integrations import INTEGRATION_REGISTRY
    config: dict[str, dict[str, Any]] = {}
    for key, integration in INTEGRATION_REGISTRY.items():
        if integration.config:
            config[key] = dict(integration.config)
    return config


AGENT_CONFIG: dict[str, dict[str, Any]] = _build_agent_config()

DEFAULT_INIT_INTEGRATION = "copilot"

#: Environment variable used to override the fallback integration that
#: ``specify init`` selects in non-interactive sessions.  Follows the existing
#: ``SPECKIT_INTEGRATION_*`` namespace (see ``SPECKIT_INTEGRATION_<KEY>_EXECUTABLE``
#: and ``SPECKIT_INTEGRATION_CATALOG_URL``).
DEFAULT_INIT_INTEGRATION_ENV_VAR = "SPECKIT_INTEGRATION_DEFAULT"


def resolve_default_init_integration() -> str:
    """Return the default init integration, honoring an env-var override.

    Reads :data:`DEFAULT_INIT_INTEGRATION_ENV_VAR`
    (``SPECKIT_INTEGRATION_DEFAULT``).  When it names a registered integration
    key, that key is returned; otherwise the hardcoded
    :data:`DEFAULT_INIT_INTEGRATION` (``"copilot"``) is used.  An invalid value
    emits a warning to stderr rather than silently falling back, so operators
    can tell a typo from an intentional default.
    """
    override = (os.environ.get(DEFAULT_INIT_INTEGRATION_ENV_VAR) or "").strip()
    if not override:
        return DEFAULT_INIT_INTEGRATION
    if override in AGENT_CONFIG:
        return override
    print(
        f"Warning: {DEFAULT_INIT_INTEGRATION_ENV_VAR}='{override}' is not a "
        f"recognized integration; falling back to '{DEFAULT_INIT_INTEGRATION}'. "
        f"Choose from: {', '.join(sorted(AGENT_CONFIG.keys()))}.",
        file=sys.stderr,
    )
    return DEFAULT_INIT_INTEGRATION


def detect_installed_integration(project_path: Path) -> tuple[str | None, tuple[str, ...]]:
    """Return the integration already installed in *project_path*.

    The first item is the key to reuse when ``--integration`` is omitted.
    The second item lists every detected key when more than one is installed
    and none is the project's recorded default. An empty project returns
    ``(None, ())`` so the caller keeps :func:`resolve_default_init_integration`.
    """
    found: set[str] = set()
    recorded: str | None = None

    options_path = project_path / ".specify" / "init-options.json"
    try:
        options = json.loads(options_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        options = {}
    if isinstance(options, dict):
        for field in ("integration", "ai"):
            value = options.get(field)
            if isinstance(value, str) and value in AGENT_CONFIG:
                recorded = value
                break

    state_path = project_path / ".specify" / "integration.json"
    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        state = {}
    if isinstance(state, dict):
        installed = state.get("installed_integrations")
        if isinstance(installed, list):
            for key in installed:
                if isinstance(key, str) and key in AGENT_CONFIG:
                    found.add(key)
        for field in ("default_integration", "integration"):
            value = state.get(field)
            if isinstance(value, str) and value in AGENT_CONFIG:
                recorded = recorded or value
                found.add(value)

    integrations_dir = project_path / ".specify" / "integrations"
    if integrations_dir.is_dir():
        for manifest in integrations_dir.glob("*.manifest.json"):
            key = manifest.name[: -len(".manifest.json")]
            if key in AGENT_CONFIG:
                found.add(key)

    folders: dict[str, list[str]] = {}
    for key, config in AGENT_CONFIG.items():
        folder = config.get("folder") if isinstance(config, dict) else None
        if isinstance(folder, str) and folder.strip():
            folders.setdefault(folder.rstrip("/"), []).append(key)
    for folder, keys in folders.items():
        if len(keys) == 1 and (project_path / folder).is_dir():
            found.add(keys[0])

    if recorded and (not found or recorded in found):
        return recorded, ()
    if len(found) == 1:
        return next(iter(found)), ()
    if len(found) > 1:
        return None, tuple(sorted(found))
    return None, ()


SCRIPT_TYPE_CHOICES: dict[str, str] = {
    "sh": "POSIX Shell (bash/zsh)",
    "ps": "PowerShell",
    "py": "Python",
}
