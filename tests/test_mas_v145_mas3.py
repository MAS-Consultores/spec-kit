"""Regresiones de v1.4.5-mas.3 (alcance 5). Fallan en 18c3ab94."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import yaml

from specify_cli.presets import PresetManager
from tests.conftest import strip_ansi

REPO = Path(__file__).resolve().parents[1]
REFERENCE = REPO / "presets" / "mas-stack-nestjs-react" / "reference"


def _node(source: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", "--input-type=module", "-e", source],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )


def test_d26_01_oxlint_copies_eslint_thresholds() -> None:
    config = json.loads((REFERENCE / ".oxlintrc.json").read_text(encoding="utf-8"))
    magic = config["rules"]["no-magic-numbers"]
    assert magic[0] == "warn"
    assert magic[1]["ignore"][:3] == [-1, 0, 1]
    assert 404 in magic[1]["ignore"]
    assert config["rules"]["max-lines"][1]["max"] == 300
    assert config["rules"]["max-lines"][1]["skipBlankLines"] is True
    assert config["rules"]["max-lines"][1]["skipComments"] is True
    assert config["rules"]["max-params"][1] == 3
    assert config["rules"]["complexity"][1]["max"] == 10
    owned = (REFERENCE / "eslint" / "oxlint-ownership.mjs").read_text(encoding="utf-8")
    for rule in ("no-magic-numbers", "max-lines", "max-params", "complexity"):
        assert rule in owned


def test_d26_02_lint_counts_and_weekly_report() -> None:
    result = _node(
        "import { lintFindings, summarizeFindings } from './scripts/harness-telemetry.mjs';"
        "import { renderHarness } from './scripts/harness-report.mjs';"
        "const summary = summarizeFindings(lintFindings('{\"diagnostics\":[{\"filename\":\"apps/api/src/pay.ts\",\"code\":\"eslint(max-lines)\"},{\"filename\":\"apps/api/src/pay.ts\",\"code\":\"eslint(complexity)\"}]}'));"
        "if (summary.byRule['max-lines'] !== 1 || summary.byFile['apps/api/src/pay.ts'] !== 2) process.exit(1);"
        "const markdown = renderHarness([{ feature: 'nomina', gate: 'lint', ok: false, phase: 'ci', round: 1, durationMs: 4, at: '2026-11-02T00:00:00Z', byRule: summary.byRule, byFile: summary.byFile }]);"
        "if (!markdown.includes('| max-lines | 1 |') || !markdown.includes('pay.ts') || !markdown.includes('2026-W')) process.exit(1);"
        "console.log('ok');"
    )
    assert result.returncode == 0, result.stderr
    package = json.loads((REFERENCE / "package.json").read_text(encoding="utf-8"))
    assert "harness-collect.mjs" in package["scripts"]["metrics"]
    assert package["scripts"]["metrics:pr"].endswith("lint-pr-summary.mjs")


def test_d26_03_evals_pass() -> None:
    result = subprocess.run(
        ["node", "scripts/run-evals.mjs"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    workflow = (REPO / ".github" / "workflows" / "nestjs-react-d18.yml").read_text(encoding="utf-8")
    assert "run-evals.mjs" in workflow


def test_d26_04_generators() -> None:
    result = _node(
        "import { renderPage } from './scripts/gen-page.mjs';"
        "const source = renderPage('reports', 'detail');"
        "const body = source.split('\\n').slice(2).join('\\n');"
        "if (!source.includes('useTranslation') || !source.includes('t(\"title\")') || /\\d/.test(body)) process.exit(1);"
        "console.log('ok');"
    )
    assert result.returncode == 0, result.stderr
    package = json.loads((REFERENCE / "package.json").read_text(encoding="utf-8"))
    script = (REFERENCE / "scripts" / "gen.mjs").read_text(encoding="utf-8")
    assert package["scripts"]["gen"] == "node scripts/gen.mjs"
    assert "gen-module.mjs" in script and "gen-page.mjs" in script


def test_d26_05_later_gates_still_run() -> None:
    security = (REFERENCE / ".github" / "workflows" / "security.yml").read_text(encoding="utf-8")
    lint_gates = (REFERENCE / ".github" / "workflows" / "lint-gates.yml").read_text(encoding="utf-8")
    assert security.index("pnpm audit") < security.index("id: semgrep")
    assert "if: always()" in security
    assert "steps.semgrep.outcome" in security
    assert lint_gates.index("id: oxlint") < lint_gates.index("id: madge")
    assert "if: always()" in lint_gates
    assert "steps.madge.outcome" in lint_gates
    result = subprocess.run(
        ["node", "scripts/run-independent-gates.mjs", "--self-test"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


def test_d26_06_mutation_exclude() -> None:
    result = _node(
        "import { mutationPlan } from './scripts/check-mutation.mjs';"
        "const plan = mutationPlan({ mutation: { modules: ['employees'], threshold: 80, paths: { employees: 'apps/api/src/modules/employees' }, exclude: ['**/*.repository.ts', 'apps/api/src/modules/tabular-import/**'] } }, ["
        "'apps/api/src/modules/employees/employees.repository.ts',"
        "'apps/api/src/modules/employees/employees.service.ts',"
        "'apps/api/src/modules/tabular-import/tabular-import.service.ts'"
        "]);"
        "if (plan.mutate.length !== 1 || plan.mutate[0] !== 'apps/api/src/modules/employees/employees.service.ts') process.exit(1);"
    )
    assert result.returncode == 0, result.stderr


def test_d26_07_coverage_skips_specify_reference() -> None:
    result = _node(
        "import { coverageRatio } from './scripts/check-diff-coverage.mjs';"
        "const diff = ["
        "'diff --git a/.specify/reference/apps/api/src/miss.ts b/.specify/reference/apps/api/src/miss.ts',"
        "'--- a/.specify/reference/apps/api/src/miss.ts',"
        "'+++ b/.specify/reference/apps/api/src/miss.ts',"
        "'@@ -0,0 +1,2 @@',"
        "'+export function miss() {',"
        "'+  return 1;',"
        "'+}'"
        "].join('\\n');"
        "const result = coverageRatio('', diff, 0.8);"
        "if (!result.ok || result.lineTotal !== 0) process.exit(1);"
    )
    assert result.returncode == 0, result.stderr


def _install(temp_dir: Path, project_dir: Path, pack_id: str, priority: int) -> None:
    src = temp_dir / f"src-{pack_id}"
    (src / "templates").mkdir(parents=True)
    (src / "templates" / "spec-template.md").write_text("# tmpl\n", encoding="utf-8")
    (src / "preset.yml").write_text(
        yaml.dump(
            {
                "schema_version": "1.0",
                "preset": {
                    "id": pack_id,
                    "name": pack_id,
                    "version": "1.0.0",
                    "description": "plain description",
                },
                "requires": {"speckit_version": ">=0.0.1"},
                "provides": {
                    "templates": [
                        {
                            "type": "template",
                            "name": "spec-template",
                            "file": "templates/spec-template.md",
                        }
                    ]
                },
            }
        ),
        encoding="utf-8",
    )
    PresetManager(project_dir).install_from_directory(src, "9.9.9", priority)


def test_d26_09_env_check_scopes_the_app_and_rejects_split_names() -> None:
    telemetry = (REFERENCE / "scripts" / "harness-telemetry.mjs").read_text(encoding="utf-8")
    assert "process.env.CI" in telemetry
    assert "process.env.SPEC_FEATURE" in telemetry
    assert "gateEnv" not in telemetry
    result = subprocess.run(
        ["node", "scripts/check-env-example.mjs", "--self-test"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    live = subprocess.run(
        ["node", "scripts/check-env-example.mjs"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert live.returncode == 0, live.stderr
    assert "env CI is read" not in live.stderr


def test_d26_08_preset_list_puts_stack_above_core(tmp_path, monkeypatch) -> None:
    project_dir = tmp_path / "project"
    templates = project_dir / ".specify" / "templates"
    templates.mkdir(parents=True)
    (templates / "spec-template.md").write_text("# Core Spec Template\n", encoding="utf-8")
    _install(tmp_path, project_dir, "mas-core", 5)
    _install(tmp_path, project_dir, "mas-stack-nestjs-react", 5)
    from unittest.mock import patch

    from typer.testing import CliRunner

    from specify_cli import app

    monkeypatch.chdir(project_dir)
    with patch.object(Path, "cwd", return_value=project_dir):
        result = CliRunner().invoke(app, ["preset", "list"])
    assert result.exit_code == 0, result.output
    output = strip_ansi(result.output)
    assert output.index("(mas-stack-nestjs-react)") < output.index("(mas-core)"), output
    ids = [pack_id for pack_id, _meta in PresetManager(project_dir).registry.list_by_priority()]
    assert ids.index("mas-stack-nestjs-react") < ids.index("mas-core")
