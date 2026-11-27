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
    assert magic[0] == "error"
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
    assert package["scripts"]["metrics"] == "node scripts/harness-metrics.mjs"
    assert package["scripts"]["metrics:pr"].endswith("lint-pr-summary.mjs")
    assert (REFERENCE / "docs/metrics/harness.md").is_file()
    assert not (REFERENCE / "docs/metrics/runs.jsonl").exists()


def test_d26_10_metrics_history_lives_on_its_branch() -> None:
    ignored = [
        line.strip()
        for line in (REFERENCE / ".gitignore").read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    assert "docs/metrics/runs.jsonl" in ignored
    assert ".specify/telemetry/runs.jsonl" in ignored
    assert "docs/metrics/harness.md" not in ignored
    agents = (REFERENCE / "AGENTS.md").read_text(encoding="utf-8")
    assert "no van en las ramas de trabajo ni en main o master" in agents
    assert "rama `metrics`" in agents
    implement = (REPO / "presets/mas-stack-nestjs-react/commands/speckit.implement.md").read_text(encoding="utf-8")
    assert "git fetch origin metrics" in implement
    assert "Do not commit `docs/metrics/runs.jsonl`" in implement
    package = json.loads((REFERENCE / "package.json").read_text(encoding="utf-8"))
    assert "--deny-warnings" in package["scripts"]["lint:fast"]
    weekly = (REFERENCE / ".github/workflows/harness-weekly.yml").read_text(encoding="utf-8")
    assert "schedule:" in weekly
    assert "workflow_dispatch:" in weekly
    assert "contents: read" in weekly
    assert "contents: write" in weekly.split("publish-metrics:")[1]
    assert "contents: write" not in weekly.split("publish-metrics:")[0]
    assert "git push origin metrics" in weekly
    assert "--force" not in weekly
    assert "git fetch origin metrics" in weekly


def test_d26_11_gate_gaming_catches_each_trick() -> None:
    result = subprocess.run(
        ["node", "scripts/check-gate-gaming.mjs", "--self-test"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    workflow = (REFERENCE / ".github/workflows/lint-gates.yml").read_text(encoding="utf-8")
    assert "gate-gaming:" in workflow
    assert "if: always()" in workflow
    assert "check-gate-gaming.mjs" in workflow
    agents = (REFERENCE / "AGENTS.md").read_text(encoding="utf-8")
    assert "Prohibido esquivar un gate" in agents
    for name in ("a-disable.diff", "b-skip.diff", "c-threshold.diff", "d-ignore.diff", "e-env.diff", "f-wrapped.diff"):
        assert (REFERENCE / "scripts/fixtures/gate-gaming" / name).is_file()
        assert (REFERENCE / "scripts/fixtures/gate-gaming" / name.replace(".diff", ".justified.diff")).is_file()


def test_d26_12_api_logs_are_structured_without_telemetry_sdk() -> None:
    package = json.loads((REFERENCE / "apps/api/package.json").read_text(encoding="utf-8"))
    assert package["dependencies"]["nestjs-pino"] == "5.3.2"
    assert package["dependencies"]["pino"] == "10.4.0"
    assert package["devDependencies"]["pino-pretty"] == "13.2.0"
    blob = json.dumps(package)
    assert "@opentelemetry" not in blob
    example = (REFERENCE / ".env.example").read_text(encoding="utf-8")
    assert "LOG_LEVEL=" in example
    redact = (REFERENCE / "apps/api/src/logging/redact.ts").read_text(encoding="utf-8")
    for field in ("password", "token", "authorization", "cookie", "set-cookie", "rut", "email", "refreshtoken"):
        assert field in redact
    spec = (REFERENCE / "apps/api/src/logging/logging.spec.ts").read_text(encoding="utf-8")
    for action in ("login", "login_failed", "roles_changed", "permissions_changed", "delete"):
        assert action in spec
    assert "JSON.parse" in spec
    assert "X-Request-Id" in (REFERENCE / "apps/api/src/logging/request-id.ts").read_text(encoding="utf-8")
    assert "pino-pretty" in (REFERENCE / "apps/api/src/logging/pino-options.ts").read_text(encoding="utf-8")
    assert "nestjs-pino" in (REFERENCE / "apps/api/src/main.ts").read_text(encoding="utf-8")
    fixtures = (REFERENCE / "scripts/check-lint-fixtures.mjs").read_text(encoding="utf-8")
    assert "apps/web/lint-fixtures/console-log.tsx" in fixtures
    assert "console.log" in (REFERENCE / "apps/web/lint-fixtures/console-log.tsx").read_text(encoding="utf-8")
    constitution = (REPO / "presets/mas-stack-nestjs-react/templates/constitution-template-append.md").read_text(encoding="utf-8")
    assert "emitir un audit" in constitution
    agents = (REFERENCE / "AGENTS.md").read_text(encoding="utf-8")
    assert "emitAudit" in agents
    assert package["dependencies"]["pino-roll"] == "4.0.0"
    assert "LOG_FILE=" in example
    assert "LOG_FILE_RETENTION_DAYS=" in example
    assert "logs/" in (REFERENCE / ".gitignore").read_text(encoding="utf-8")
    assert "logs/" in (REFERENCE / ".dockerignore").read_text(encoding="utf-8")
    assert "does not create a file when the path is empty" in spec
    assert "writes redacted JSON when a path is set" in spec


def test_d26_14_example_domain_and_knip_imports() -> None:
    spec = (REFERENCE / "apps/api/src/logging/logging.spec.ts").read_text(encoding="utf-8")
    assert "example.com" not in spec
    assert "person@infra.test" in spec
    result = subprocess.run(
        ["node", "scripts/check-no-example-slice.mjs"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    options = (REFERENCE / "apps/api/src/logging/pino-options.ts").read_text(encoding="utf-8")
    assert 'require.resolve("pino-pretty")' in options
    assert "export function rollOptions" not in options
    redact = (REFERENCE / "apps/api/src/logging/redact.ts").read_text(encoding="utf-8")
    assert "export function isSensitiveKey" not in redact


def test_d26_15_magic_numbers_are_errors_and_wrappers_fail() -> None:
    env = (REFERENCE / "apps/api/src/config/env.ts").read_text(encoding="utf-8")
    assert "export const DEFAULT_LOG_FILE_RETENTION_DAYS = 14" in env
    assert 'Number("14")' not in env
    assert "parseInt(" not in env
    package = json.loads((REFERENCE / "package.json").read_text(encoding="utf-8"))
    assert package["scripts"]["lint:fast"].endswith("oxlint --deny-warnings")
    owned = (REFERENCE / "eslint/oxlint-ownership.mjs").read_text(encoding="utf-8")
    assert 'oxlint: "no-magic-numbers"' in owned
    assert 'severity: "error"' in owned
    result = subprocess.run(
        ["node", "scripts/check-gate-gaming.mjs", "--self-test"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


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
