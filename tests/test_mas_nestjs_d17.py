"""Regressions D17: preset gates after syncing a product onto v1.4.3-mas.3."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
REFERENCE = REPO / "presets" / "mas-stack-nestjs-react" / "reference"
SCRIPTS = REFERENCE / "scripts"


def _run(args: list[str], cwd: Path, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    merged.setdefault("GIT_AUTHOR_NAME", "d17")
    merged.setdefault("GIT_AUTHOR_EMAIL", "d17@example.com")
    merged.setdefault("GIT_COMMITTER_NAME", "d17")
    merged.setdefault("GIT_COMMITTER_EMAIL", "d17@example.com")
    if env:
        merged.update(env)
    return subprocess.run(args, cwd=cwd, env=merged, capture_output=True, text=True, check=False)


def _git(cwd: Path, *args: str) -> None:
    result = _run(["git", *args], cwd)
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)


def test_d17_01_diff_base_is_pr_merge_base_and_loads_project_eslint(tmp_path: Path) -> None:
    source = (SCRIPTS / "check-diff-quality.mjs").read_text(encoding="utf-8")
    assert "overrideConfigFile" not in source
    workflow = (REFERENCE / ".github" / "workflows" / "diff-quality.yml").read_text(encoding="utf-8")
    assert "fetch-depth: 0" in workflow

    _git(tmp_path, "init", "-b", "main")
    _git(tmp_path, "config", "user.email", "d17@example.com")
    _git(tmp_path, "config", "user.name", "d17")
    (tmp_path / "keep.ts").write_text("export const value = 1;\n", encoding="utf-8")
    _git(tmp_path, "add", "keep.ts")
    _git(tmp_path, "commit", "-m", "base")
    base = _run(["git", "rev-parse", "HEAD"], tmp_path).stdout.strip()
    _git(tmp_path, "checkout", "-b", "feature")
    (tmp_path / "keep.ts").write_text("export const value = 15;\n", encoding="utf-8")
    _git(tmp_path, "add", "keep.ts")
    _git(tmp_path, "commit", "-m", "change")
    _git(tmp_path, "update-ref", "refs/remotes/origin/main", base)

    result = _run(
        ["node", str(SCRIPTS / "check-diff-quality.mjs"), "--print-base"],
        tmp_path,
        {"QUALITY_GIT_DIR": str(tmp_path), "GITHUB_BASE_REF": "main"},
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == base


def test_d17_02_coverage_gate_does_not_pass_without_lcov(tmp_path: Path) -> None:
    source = (SCRIPTS / "check-diff-coverage.mjs").read_text(encoding="utf-8")
    assert "sin lcov en este paso" not in source
    result = _run(["node", str(SCRIPTS / "check-diff-coverage.mjs")], tmp_path)
    assert result.returncode != 0
    assert "exige --lcov" in result.stderr
    package = json.loads((REFERENCE / "package.json").read_text(encoding="utf-8"))
    lint = package["scripts"]["lint"]
    verify = package["scripts"]["verify"]
    assert "check-diff-coverage.mjs --self-test" in lint
    assert "check-diff-coverage.mjs --gate" not in lint
    assert "check-diff-coverage.mjs --gate" in verify


def test_d17_03_component_tests_do_not_require_shell() -> None:
    result = _run(["node", str(SCRIPTS / "check-component-tests.mjs"), "--self-test"], SCRIPTS)
    assert result.returncode == 0, result.stderr
    assert "no-shell ok" in result.stdout
    assert "apps/web/src/shell" not in (SCRIPTS / "check-component-tests.mjs").read_text(encoding="utf-8")


def test_d17_04_jscpd_skip_is_not_tied_to_a_filename(tmp_path: Path) -> None:
    baseline = (SCRIPTS / "check-quality-baseline.mjs").read_text(encoding="utf-8")
    assert 'join(root, "scripts", "check-gen-fitness.mjs")' not in baseline
    assert "check-module-fitness.mjs" in baseline
    scripts = tmp_path / "scripts"
    scripts.mkdir()
    (tmp_path / "quality-gates.json").write_text(
        json.dumps({"jscpdSkipScripts": ["check-module-fitness.mjs"]}),
        encoding="utf-8",
    )
    (scripts / "check-module-fitness.mjs").write_text(
        'run("pnpm", ["lint", "--", "--skip-jscpd-ratchet"]);\n',
        encoding="utf-8",
    )
    probe = tmp_path / "probe.mjs"
    probe.write_text(
        "import { pathToFileURL } from 'node:url';\n"
        f"const mod = await import(pathToFileURL({str(SCRIPTS / 'quality-gate-config.mjs')!r}));\n"
        "const found = mod.jscpdSkipOwners(process.argv[2]);\n"
        "if (found.owners[0] !== 'check-module-fitness.mjs' || found.unexpected.length) {\n"
        "  console.error(JSON.stringify(found));\n"
        "  process.exit(1);\n"
        "}\n"
        "console.log('d17-04 ok');\n",
        encoding="utf-8",
    )
    result = _run(["node", str(probe), str(tmp_path)], tmp_path)
    assert result.returncode == 0, result.stderr
    assert "d17-04 ok" in result.stdout


def test_d17_05_dependency_cruiser_exports_and_product_knip() -> None:
    cruiser = (REFERENCE / ".dependency-cruiser.cjs").read_text(encoding="utf-8")
    assert "enhancedResolveOptions" in cruiser
    assert "exportsFields" in cruiser
    product = json.loads((REFERENCE / "knip.product.json").read_text(encoding="utf-8"))
    assert product["ignore"] == []
    runner = (SCRIPTS / "run-knip.mjs").read_text(encoding="utf-8")
    assert "knip.product.json" in runner
    assert "mergeKnipConfig" in runner


def test_d17_06_hidden_service_deps_are_an_adoption_rule() -> None:
    config = (REFERENCE / "eslint.config.js").read_text(encoding="utf-8")
    assert '"mas/no-hidden-service-deps": "warn"' in config
    assert '"mas/no-hidden-service-deps": "error"' not in config
    quality = (SCRIPTS / "check-diff-quality.mjs").read_text(encoding="utf-8")
    assert "mas/no-hidden-service-deps" in quality.split("export function", 1)[0]
    result = _run(["node", str(SCRIPTS / "check-diff-quality.mjs"), "--self-test"], SCRIPTS)
    assert result.returncode == 0, result.stderr
