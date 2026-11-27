"""Regresiones D18 del preset nestjs-react en v1.4.3-mas.4."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
REFERENCE = REPO / "presets" / "mas-stack-nestjs-react" / "reference"
SCRIPTS = REFERENCE / "scripts"


def _run(script: str, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(SCRIPTS / script), *args],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )


def test_d18_01_mutation_stays_on_the_critical_diff() -> None:
    result = _run("check-mutation.mjs", "--self-test")
    assert result.returncode == 0, result.stderr
    gates = json.loads((REFERENCE / "quality-gates.json").read_text(encoding="utf-8"))
    assert gates["mutation"]["modules"] == ["nomina", "permisos", "auth"]
    assert gates["mutation"]["threshold"] >= 1


def test_d18_02_public_api_snapshot_requires_a_reason() -> None:
    result = _run("check-public-api.mjs", "--self-test")
    assert result.returncode == 0, result.stderr
    assert (REFERENCE / "api-snapshots" / "JUSTIFICATION.md").is_file()


def test_d18_03_size_budget_errors_on_new_files_only() -> None:
    result = _run("check-size-budget.mjs", "--self-test")
    assert result.returncode == 0, result.stderr
    limit = (REFERENCE / ".size-limit.json").read_text(encoding="utf-8")
    assert "web initial" in limit


def test_d18_04_contract_rejects_an_unknown_field() -> None:
    result = _run("check-api-contract.mjs", "--self-test")
    assert result.returncode == 0, result.stderr


def test_d18_05_ci_runs_audit_and_semgrep() -> None:
    workflow = (REFERENCE / ".github" / "workflows" / "security.yml").read_text(encoding="utf-8")
    assert "pnpm audit --audit-level=high" in workflow
    assert "semgrep scan" in workflow
    assert (REFERENCE / ".semgrep.yml").is_file()


def test_d18_06_oxlint_does_not_share_rules_or_drop_the_ratchet() -> None:
    result = _run("check-oxlint-split.mjs", "--self-test")
    assert result.returncode == 0, result.stderr
    assert "counts-equal" in result.stdout
    package = json.loads((REFERENCE / "package.json").read_text(encoding="utf-8"))
    assert package["devDependencies"]["oxlint"] == "1.94.0"
    assert package["devDependencies"]["eslint-plugin-oxlint"] == "1.94.0"
    assert "oxlint" in package["scripts"]["lint:fast"]
    verify = package["scripts"]["verify"]
    assert verify.index("pnpm lint:fast") < verify.index("pnpm lint &&")


def test_d18_07_telemetry_is_local_jsonl() -> None:
    result = _run("harness-telemetry.mjs", "--self-test")
    assert result.returncode == 0, result.stderr
    report = _run("harness-report.mjs", "--self-test")
    assert report.returncode == 0, report.stderr
    smoke = (REPO / ".github" / "workflows" / "nestjs-react-smoke.yml").read_text(encoding="utf-8")
    assert "harness-telemetry" in smoke


def test_d18_08_every_feature_has_a_critical_e2e() -> None:
    result = _run("check-critical-e2e.mjs", "--self-test")
    assert result.returncode == 0, result.stderr
    workflow = (REFERENCE / ".github" / "workflows" / "e2e-critical.yml").read_text(encoding="utf-8")
    assert "continue-on-error" not in workflow


def test_d18_09_visual_screenshots_stay_inside_the_exception() -> None:
    result = _run("check-visual-policy.mjs", "--self-test")
    assert result.returncode == 0, result.stderr
    constitution = (
        REPO / "presets" / "mas-stack-nestjs-react" / "templates" / "constitution-template-append.md"
    ).read_text(encoding="utf-8")
    assert "apps/web/e2e/visual/" in constitution
