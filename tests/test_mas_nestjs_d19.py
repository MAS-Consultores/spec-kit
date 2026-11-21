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


def _clean_env() -> dict[str, str]:
    return {key: value for key, value in os.environ.items() if key != "GITHUB_BASE_REF"}


def _init(repo: Path) -> None:
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "d19@invalid.test")
    _git(repo, "config", "user.name", "d19")


def _commit(repo: Path, message: str) -> None:
    _git(repo, "add", ".")
    _git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", message)


def test_d19_02_gitleaks_config_keeps_default_rules() -> None:
    config = (REFERENCE / ".gitleaks.toml").read_text(encoding="utf-8")
    assert "useDefault = true" in config
    result = subprocess.run(
        ["node", str(REFERENCE / "scripts" / "check-gitleaks-fixture.mjs"), "--self-test"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


def test_d19_03_committed_public_export_without_justification_is_an_error(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    _init(repo)
    index = repo / "packages" / "contracts" / "src" / "index.ts"
    index.parent.mkdir(parents=True)
    index.write_text("export const healthResponse = true;\n", encoding="utf-8")
    snapshot = repo / "api-snapshots" / "packages__contracts__src__index.ts.json"
    snapshot.parent.mkdir()
    snapshot.write_text('[\n  "healthResponse"\n]\n', encoding="utf-8")
    _commit(repo, "base")
    index.write_text("export const healthResponse = true;\nexport const extra = 1;\n", encoding="utf-8")
    _commit(repo, "drift")
    status = subprocess.run(["git", "status", "--porcelain"], cwd=repo, capture_output=True, text=True, check=True)
    assert status.stdout == ""

    result = subprocess.run(
        ["node", str(REFERENCE / "scripts" / "check-public-api.mjs")],
        cwd=repo,
        capture_output=True,
        text=True,
        env=_clean_env(),
        check=False,
    )
    assert result.returncode != 0, result.stdout
    assert "sin justificación" in result.stderr


def test_d19_04_committed_file_and_module_over_budget_are_errors(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    _init(repo)
    (repo / "quality-gates.json").write_text(
        json.dumps({"fileLineBudget": 3, "moduleLineBudget": 3}),
        encoding="utf-8",
    )
    (repo / ".size-limit.json").write_text(
        '[{"name":"web initial","path":"apps/web/dist/assets/*.js","limit":"500 kB"}]\n',
        encoding="utf-8",
    )
    module = repo / "apps" / "api" / "src" / "modules" / "auth"
    module.mkdir(parents=True)
    (module / "old.ts").write_text(
        "export const a = 1;\nexport const b = 2;\nexport const c = 3;\nexport const d = 4;\n",
        encoding="utf-8",
    )
    _commit(repo, "base")
    (module / "new.ts").write_text(
        "export const a = 1;\nexport const b = 2;\nexport const c = 3;\nexport const d = 4;\n",
        encoding="utf-8",
    )
    _commit(repo, "new")
    status = subprocess.run(["git", "status", "--porcelain"], cwd=repo, capture_output=True, text=True, check=True)
    assert status.stdout == ""

    result = subprocess.run(
        ["node", str(REFERENCE / "scripts" / "check-size-budget.mjs")],
        cwd=repo,
        capture_output=True,
        text=True,
        env=_clean_env(),
        check=False,
    )
    assert result.returncode != 0, result.stdout
    assert "new.ts" in result.stderr
    assert "módulo auth" in result.stderr


def test_d19_05_new_api_file_missing_from_lcov_is_uncovered(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    _init(repo)
    (repo / "keep.ts").write_text("export const value = 1;\n", encoding="utf-8")
    _commit(repo, "base")
    miss = repo / "apps" / "api" / "src" / "miss.ts"
    miss.parent.mkdir(parents=True)
    miss.write_text("export function miss() {\n  return 1;\n}\n", encoding="utf-8")
    _commit(repo, "miss")
    status = subprocess.run(["git", "status", "--porcelain"], cwd=repo, capture_output=True, text=True, check=True)
    assert status.stdout == ""
    diff = subprocess.run(["git", "diff", "-U0", "HEAD^", "HEAD"], cwd=repo, capture_output=True, text=True, check=True)

    script = REFERENCE / "scripts" / "check-diff-coverage.mjs"
    source = script.read_text(encoding="utf-8")
    source = source.replace(
        'from "./check-diff-quality.mjs"',
        f'from "{(script.parent / "check-diff-quality.mjs").as_uri()}"',
    )
    marker = 'if (process.argv.includes("--self-test"))'
    module = tmp_path / "coverage.mjs"
    module.write_text(source[: source.index(marker)], encoding="utf-8")
    probe = """
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const diff = readFileSync(0, "utf8");
const mod = await import(pathToFileURL(process.argv[1]));
const result = mod.coverageRatio(
  "SF:apps/api/src/other.ts\\nDA:1,1\\nend_of_record\\n",
  diff,
  0.8,
);
process.stdout.write(JSON.stringify({ ok: result.ok, lineTotal: result.lineTotal ?? 0 }));
"""
    result = subprocess.run(
        ["node", "--input-type=module", "-e", probe, str(module)],
        input=diff.stdout,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert payload["ok"] is False
    assert payload["lineTotal"] >= 1
