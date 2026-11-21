"""Regresión D19: el gate de mutación mide el diff ya commiteado."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
REFERENCE = REPO / "presets" / "mas-stack-nestjs-react" / "reference"
SCRIPT = REFERENCE / "scripts" / "check-mutation.mjs"


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True)


def test_d19_01_committed_diff_is_measured_and_runner_is_declared(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "mutation@example.com")
    _git(repo, "config", "user.name", "mutation")
    (repo / "quality-gates.json").write_text(
        json.dumps(
            {
                "mutation": {
                    "modules": ["auth"],
                    "threshold": 80,
                    "paths": {"auth": "apps/api/src/modules/auth"},
                }
            }
        ),
        encoding="utf-8",
    )
    _git(repo, "add", "quality-gates.json")
    _git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "base")
    service = repo / "apps/api/src/modules/auth/auth.service.ts"
    service.parent.mkdir(parents=True)
    service.write_text("export const value = 1;\n", encoding="utf-8")
    _git(repo, "add", ".")
    _git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "feature")

    env = {key: value for key, value in os.environ.items() if key != "GITHUB_BASE_REF"}
    result = subprocess.run(
        ["node", str(SCRIPT)],
        cwd=repo,
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "apps/api/src/modules/auth/auth.service.ts" in result.stdout
    assert "sin diff" not in result.stdout

    self_test = subprocess.run(
        ["node", str(SCRIPT), "--self-test"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert self_test.returncode == 0, self_test.stderr
    package = json.loads((REFERENCE / "package.json").read_text(encoding="utf-8"))
    assert package["devDependencies"]["@stryker-mutator/vitest-runner"] == "10.1.1"
    assert '"@stryker-mutator/vitest-runner"' in (REFERENCE / "knip.json").read_text(encoding="utf-8")
