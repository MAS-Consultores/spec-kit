"""Windows regression coverage for the interpreter used by preset composition."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from tests.parity_helpers import clean_env, install_composition_stack, install_scripts, make_repo, make_yaml_less_venv

SHELLS = [path for name in ("powershell.exe", "pwsh") if (path := shutil.which(name))]
pytestmark = pytest.mark.skipif(os.name != "nt" or not SHELLS, reason="Windows PowerShell regression")
COMMON = Path(__file__).resolve().parents[1] / "scripts/powershell/common.ps1"


def quoted(value: str | Path) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def shell_run(shell: str, command: str, env: dict[str, str], cwd: Path):
    return subprocess.run([shell, "-NoProfile", "-NonInteractive", "-Command", command],
                          cwd=cwd, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=45)


@pytest.mark.parametrize("shell", SHELLS, ids=lambda p: Path(p).name)
@pytest.mark.parametrize("failure", ["exit /b 9009", "echo not-python", "echo Python 2.7"])
def test_broken_python3_falls_back_to_working_python(shell, failure, tmp_path):
    shims = tmp_path / "path with spaces"
    shims.mkdir()
    (shims / "python3.cmd").write_text("@echo off\n" + failure + "\n", encoding="utf-8")
    (shims / "python.cmd").write_text(f'@echo off\n"{sys.executable}" %*\n', encoding="utf-8")
    env = clean_env()
    env["PATH"] = str(shims) + os.pathsep + env["PATH"]
    result = shell_run(shell, f". {quoted(COMMON)}; @(Get-Python3Command) | ConvertTo-Json -Compress", env, tmp_path)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == "python"


@pytest.mark.parametrize("shell", SHELLS, ids=lambda p: Path(p).name)
@pytest.mark.parametrize("variable", ["SPECKIT_PYTHON_EXECUTABLE", "SPECKIT_PYTHON"])
def test_explicit_python_with_yaml_is_used(shell, variable, tmp_path):
    env = clean_env()
    env[variable] = sys.executable
    result = shell_run(shell, f". {quoted(COMMON)}; @(Get-Python3Command) | ConvertTo-Json -Compress", env, tmp_path)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == sys.executable


@pytest.mark.parametrize("shell", SHELLS, ids=lambda p: Path(p).name)
def test_resolver_keeps_manifest_parser_diagnostic(shell, tmp_path):
    repo = make_repo(tmp_path)
    install_scripts(repo, "resolve-template")
    install_composition_stack(repo, "constitution-template", "# Core\n")
    manifest = repo / ".specify/presets/wrap-pack/preset.yml"
    manifest.write_text("provides: not-a-mapping\n", encoding="utf-8")
    env = clean_env()
    env["SPECKIT_PYTHON_EXECUTABLE"] = sys.executable
    script = repo / ".specify/scripts/powershell/resolve-template.ps1"
    result = shell_run(shell, f"& {quoted(script)} constitution-template -Json", env, repo)
    assert result.returncode != 0
    assert "manifest provides must be a mapping" in result.stderr
    assert re.search(r"exit code\s*(?:\|\s*)?3", result.stderr)
    assert result.stdout == ""


@pytest.mark.parametrize("shell", SHELLS, ids=lambda p: Path(p).name)
def test_yaml_less_python3_falls_back_and_composes(shell, tmp_path):
    no_yaml = make_yaml_less_venv(tmp_path / "no yaml")
    shims = tmp_path / "shims"
    shims.mkdir()
    (shims / "python3.cmd").write_text(f'@echo off\n"{no_yaml}" %*\n', encoding="utf-8")
    repo = make_repo(tmp_path)
    install_scripts(repo, "resolve-template")
    expected = install_composition_stack(repo, "constitution-template", "# Core\n")
    env = clean_env()
    env["PATH"] = os.pathsep.join((str(shims), str(Path(sys.executable).parent), env["PATH"]))
    env["SPECKIT_PYTHON_EXECUTABLE"] = str(tmp_path / "missing.exe")
    script = repo / ".specify/scripts/powershell/resolve-template.ps1"
    result = shell_run(shell, f"& {quoted(script)} constitution-template -Json", env, repo)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["TEMPLATE_CONTENT"] == expected


@pytest.mark.parametrize("shell", SHELLS, ids=lambda p: Path(p).name)
def test_launcher_fallback_and_no_usable_python(shell, tmp_path):
    shims = tmp_path / "shims"
    shims.mkdir()
    for name in ("python3", "python"):
        (shims / f"{name}.cmd").write_text("@echo off\nexit /b 9009\n", encoding="utf-8")
    launcher = shims / "py.cmd"
    launcher.write_text(f'@echo off\nif not "%1"=="-3" exit /b 55\n"{sys.executable}" %2 %3\n', encoding="utf-8")
    env = clean_env()
    env["PATH"] = str(shims) + os.pathsep + env["PATH"]
    command = f". {quoted(COMMON)}; @(Get-Python3Command) | ConvertTo-Json -Compress"
    result = shell_run(shell, command, env, tmp_path)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == ["py", "-3"]
    launcher.write_text("@echo off\nexit /b 9009\n", encoding="utf-8")
    result = shell_run(shell, f". {quoted(COMMON)}; $null -eq (Get-Python3Command)", env, tmp_path)
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "True"


@pytest.mark.parametrize("shell", SHELLS, ids=lambda p: Path(p).name)
def test_resolver_reports_process_failure_without_blaming_manifest(shell, tmp_path):
    repo = make_repo(tmp_path)
    install_scripts(repo, "resolve-template")
    install_composition_stack(repo, "constitution-template", "# Core\n")
    # Simulate a runtime import failure after the initial no-argument probe.
    (tmp_path / "yaml.py").write_text(
        "import sys\nif len(sys.argv) > 1:\n"
        "    sys.stderr.write('resolver-unavailable\\n')\n    sys.exit(47)\n",
        encoding="utf-8",
    )
    env = clean_env()
    env["SPECKIT_PYTHON_EXECUTABLE"] = sys.executable
    env["PYTHONPATH"] = str(tmp_path)
    script = repo / ".specify/scripts/powershell/resolve-template.ps1"
    result = shell_run(shell, f"& {quoted(script)} constitution-template -Json", env, repo)
    assert result.returncode != 0
    assert "Python failed while resolving preset manifest" in result.stderr
    assert re.search(r"exit code\s*(?:\|\s*)?47", result.stderr)
    assert "resolver-unavailable" in result.stderr
    assert "Invalid preset manifest" not in result.stderr
