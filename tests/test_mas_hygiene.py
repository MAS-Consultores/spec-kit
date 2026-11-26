"""D23: code and pull request hygiene on every MAS stack."""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess

import yaml
from pathlib import Path

import pytest
from typer.testing import CliRunner

from specify_cli import app

REPO = Path(__file__).resolve().parents[1]
STACKS = (
    "cakephp2-mysql",
    "moodle3",
    "moodle5-plugin",
    "moodle5-portal",
    "laravel-inertia-react",
    "nestjs-react",
)
BASH = REPO / "presets/mas-core/scripts/bash"
PS = REPO / "presets/mas-core/scripts/powershell"
TS_SKILL = REPO / "presets/mas-stack-nestjs-react/skills/clean-code-typescript/SKILL.md"


def _init(project: Path, stack: str) -> None:
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "cursor-agent",
            "--stack",
            stack,
            "--ignore-agent-tools",
            "--script",
            "sh",
            "--skip-external-skills",
            "--non-interactive",
        ],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output


@pytest.fixture(scope="module")
def projects(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Path]:
    root = tmp_path_factory.mktemp("d23")
    created: dict[str, Path] = {}
    for stack in STACKS:
        project = root / stack
        _init(project, stack)
        created[stack] = project
    return created


def _bash(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["bash", *args], capture_output=True, text=True, check=False)


def _ps(script: str, *args: str) -> subprocess.CompletedProcess[str] | None:
    if shutil.which("pwsh") is None:
        return None
    return subprocess.run(
        ["pwsh", "-NoProfile", "-File", str(PS / script), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _write(path: Path, text: str) -> Path:
    path.write_text(text, encoding="utf-8")
    return path


def test_d23_01_constitution_xii_and_xiii(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        text = (project / ".specify/memory/constitution.md").read_text(encoding="utf-8")
        assert "### XII. Higiene de código y PRs" in text, stack
        assert "recomendado; aplica criterio" in text, stack
        assert "### XIII. Código limpio" in text, stack
        assert "**Version**: 1.2.0" in text, stack


def test_d23_02_pr_template_and_ci(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        body = (project / ".github/pull_request_template.md").read_text(encoding="utf-8")
        assert "Plantilla recomendada" in body, stack
        for heading in ("Qué y por qué", "Spec/tarea", "Cómo se validó", "Riesgos/rollback", "Fuera de alcance"):
            assert heading in body, stack
        workflow = (project / ".specify/templates/ci/pr-hygiene.yml").read_text(encoding="utf-8")
        assert "contents: read" in workflow, stack
        assert "edited" in workflow, stack
        assert "check-pr-body.sh" in workflow, stack
        assert "check-commit-msg" not in workflow, stack


def test_d23_03_pr_body_sections(tmp_path: Path) -> None:
    good = _write(
        tmp_path / "good.md",
        "\n".join([
            "## Qué y por qué",
            "el login fallaba",
            "## Spec/tarea",
            "specs/001-login",
            "## Cómo se validó",
            "phpunit en verde",
            "## Riesgos/rollback",
            "revertir el commit",
            "## Fuera de alcance",
            "facturación",
            "",
        ]),
    )
    rabbit = _write(
        tmp_path / "rabbit.md",
        "\n".join([
            "## Qué y por qué",
            "<!-- coderabbit -->",
            "resumen automático",
            "<!-- /coderabbit -->",
            "## Spec/tarea",
            "specs/001-login",
            "## Cómo se validó",
            "phpunit",
            "## Riesgos/rollback",
            "revertir",
            "## Fuera de alcance",
            "nada",
            "",
        ]),
    )
    promo = _write(tmp_path / "promo.md", "## Qué y por qué\nfalta el resto\n")
    ok = _bash(str(BASH / "check-pr-body.sh"), str(good))
    assert ok.returncode == 0, ok.stderr
    warned = _bash(str(BASH / "check-pr-body.sh"), str(rabbit))
    assert warned.returncode == 0, warned.stderr
    assert "INFORMA" in warned.stderr
    info = _bash(str(BASH / "check-pr-body.sh"), "--promotion", str(promo))
    assert info.returncode == 0, info.stderr
    assert "INFORMA" in info.stderr
    ps_bad = _ps("check-pr-body.ps1", str(rabbit))
    if ps_bad is not None:
        assert ps_bad.returncode == 0
        assert "INFORMA" in ps_bad.stderr
    bare = _write(tmp_path / "bare.md", "## Qué y por qué\nsolo el motivo\n")
    blocked = _bash(str(BASH / "check-pr-body.sh"), "--evidence", str(bare))
    assert blocked.returncode != 0
    assert "Cómo se validó" in blocked.stderr
    covered = _write(
        tmp_path / "covered.md",
        "## Cómo se validó\nphpunit\n## Riesgos/rollback\nrevertir\n",
    )
    allowed = _bash(str(BASH / "check-pr-body.sh"), "--evidence", str(covered))
    assert allowed.returncode == 0, allowed.stderr
    workflow = (REPO / "presets/mas-core/templates/ci/pr-hygiene.yml").read_text(encoding="utf-8")
    assert "--evidence" in workflow
    assert "upgrade" in workflow.lower() or "Upgrade" in workflow


def test_d23_04_commit_validator_stays_mas2(tmp_path: Path) -> None:
    """Conventional Commits from mas.2 is unchanged, including the Merge prefix."""
    script = str(BASH / "check-commit-msg.sh")
    loose = _bash(script, "Merge 001-x")
    assert loose.returncode == 0, loose.stderr
    workflow = (REPO / "presets/mas-core/templates/ci/conventional-commits.yml").read_text(encoding="utf-8")
    assert "--title" not in workflow
    body = _write(tmp_path / "body.md", "## Qué y por qué\nsolo esto\n")
    warned = _bash(str(BASH / "check-pr-body.sh"), "--title", "Update", str(body))
    assert warned.returncode == 0, warned.stderr
    assert "INFORMA" in warned.stderr


def test_d23_05_generic_titles_inform(tmp_path: Path) -> None:
    body = _write(tmp_path / "body.md", "x\n")
    script = str(BASH / "check-pr-body.sh")
    generic = _bash(script, "--title", "feat(api): Update", str(body))
    assert generic.returncode == 0, generic.stderr
    assert "INFORMA" in generic.stderr
    short = _bash(script, "--title", "Fix12", str(body))
    assert short.returncode == 0, short.stderr
    assert "INFORMA" in short.stderr
    ok = _bash(script, "--title", "chore(release): promover testing a master (#12)", str(body))
    assert ok.returncode == 0, ok.stderr
    assert "título genérico" not in ok.stderr
    ps_ok = _ps("check-pr-body.ps1", "-Title", "feat(api): Update", str(body))
    if ps_ok is not None:
        assert ps_ok.returncode == 0, ps_ok.stderr
        assert "INFORMA" in ps_ok.stderr
    commit = str(BASH / "check-commit-msg.sh")
    generic_commit = _bash(commit, "feat: update")
    assert generic_commit.returncode == 0, generic_commit.stderr
    assert "INFORMA" in generic_commit.stderr
    real_fix = _bash(commit, "fix: add login form")
    assert real_fix.returncode == 0, real_fix.stderr
    assert "INFORMA" not in real_fix.stderr
    broken = _bash(commit, "Update")
    assert broken.returncode != 0


def test_d23_06_junk_and_certificates(tmp_path: Path) -> None:
    names = _write(
        tmp_path / "names.txt",
        ".DS_Store\napp.log\nsecrets/cert.pem\nTest/Fixture/sample.pem\n",
    )
    result = _bash(str(BASH / "check-junk-files.sh"), "--names", str(names))
    assert result.returncode != 0
    assert "cert.pem" in result.stderr
    assert "sample.pem" not in result.stderr
    ps = _ps("check-junk-files.ps1", "-Names", str(names))
    if ps is not None:
        assert ps.returncode != 0


def test_d23_07_size_budget(tmp_path: Path) -> None:
    config = _write(
        tmp_path / "hygiene.yml",
        "h4_mode: warn\nown_code_warn: 800\nown_code_block: 1500\nsize_excludes:\n  - vendor/\n",
    )
    numstat = _write(tmp_path / "numstat.txt", "1600\t0\tsrc/App.php\n4000\t0\tvendor/lib.php\n")
    warned = _bash(
        str(BASH / "check-pr-size.sh"),
        "--config",
        str(config),
        "--numstat",
        str(numstat),
    )
    assert warned.returncode == 0, warned.stderr
    assert "1600" in warned.stderr
    blocked_cfg = _write(tmp_path / "block.yml", "h4_mode: block\nown_code_warn: 800\nown_code_block: 1500\nsize_excludes:\n  - vendor/\n")
    blocked = _bash(
        str(BASH / "check-pr-size.sh"),
        "--config",
        str(blocked_cfg),
        "--numstat",
        str(numstat),
    )
    assert blocked.returncode != 0
    body = _write(tmp_path / "body.md", "motivo pr-grande\n")
    allowed = _bash(
        str(BASH / "check-pr-size.sh"),
        "--config",
        str(blocked_cfg),
        "--numstat",
        str(numstat),
        "--labels",
        "pr-grande-justificado",
        "--body",
        str(body),
    )
    assert allowed.returncode == 0, allowed.stderr


def test_d23_08_tests_in_diff(tmp_path: Path) -> None:
    numstat = _write(tmp_path / "numstat.txt", "400\t0\tsrc/App.php\n")
    legacy = _write(
        tmp_path / "legacy.yml",
        "harness: false\ntest_line_threshold: 300\ntest_globs:\n  - '*Test.php'\nsize_excludes:\n  - vendor/\n",
    )
    info = _bash(str(BASH / "check-tests-in-diff.sh"), "--config", str(legacy), "--numstat", str(numstat))
    assert info.returncode == 0
    assert "INFORMA" in info.stderr
    harness = _write(tmp_path / "harness.yml", "harness: true\ntest_line_threshold: 300\ntest_globs:\n  - '*.spec.ts'\nsize_excludes:\n  - vendor/\n")
    bad = _bash(str(BASH / "check-tests-in-diff.sh"), "--config", str(harness), "--numstat", str(numstat))
    assert bad.returncode != 0


def test_d23_09_base_branch(tmp_path: Path) -> None:
    config = _write(
        tmp_path / "hygiene.yml",
        "production_branch: master\nintegration_refs:\n  - testing\n  - hotfix/*\n",
    )
    script = str(BASH / "check-base-branch.sh")
    denied = _bash(script, "--config", str(config), "--base", "master", "--head", "feature/login")
    assert denied.returncode != 0
    testing = _bash(script, "--config", str(config), "--base", "master", "--head", "testing")
    assert testing.returncode == 0, testing.stderr
    hotfix = _bash(script, "--config", str(config), "--base", "master", "--head", "hotfix/login")
    assert hotfix.returncode == 0, hotfix.stderr
    other = _bash(script, "--config", str(config), "--base", "develop", "--head", "feature/login")
    assert other.returncode == 0


def test_d23_10_debug_leftovers(tmp_path: Path) -> None:
    diff = _write(tmp_path / "diff.txt", "+++ src/App.php\n+    dd($user);\n+    return 1;\n")
    result = _bash(str(BASH / "check-debug-leftovers.sh"), "--diff", str(diff))
    assert result.returncode == 1
    assert "MAS-DEBUG" in result.stderr
    assert "dd(" in result.stderr
    ps = _ps("check-debug-leftovers.ps1", "-Diff", str(diff))
    if ps is not None:
        assert ps.returncode != 0


def test_d23_11_empty_diff(tmp_path: Path) -> None:
    config = _write(tmp_path / "hygiene.yml", "h4_mode: block\nsize_excludes:\n  - vendor/\n")
    numstat = _write(tmp_path / "numstat.txt", "")
    result = _bash(str(BASH / "check-pr-size.sh"), "--config", str(config), "--numstat", str(numstat))
    assert result.returncode == 0
    assert "INFORMA" in result.stderr


def test_d23_12_semgrep_and_security_template() -> None:
    hygiene = (REPO / "presets/mas-core/semgrep/mas-hygiene.yml").read_text(encoding="utf-8")
    cake = (REPO / "presets/mas-core/semgrep/mas-security-cake.yml").read_text(encoding="utf-8")
    assert "mas-user-id-permission" in hygiene
    assert "mas-cake-auth-allow" in cake
    workflow = (REPO / "presets/mas-core/templates/ci/security.yml").read_text(encoding="utf-8")
    assert "--baseline-commit" in workflow
    assert "semgrep==1.186.0" in workflow
    assert "gitleaks_8.24.3" in workflow


def test_d23_13_hygiene_yml_per_stack(projects: dict[str, Path]) -> None:
    cake = (projects["cakephp2-mysql"] / ".specify/hygiene.yml").read_text(encoding="utf-8")
    moodle = (projects["moodle3"] / ".specify/hygiene.yml").read_text(encoding="utf-8")
    nest = (projects["nestjs-react"] / ".specify/hygiene.yml").read_text(encoding="utf-8")
    assert "webroot/files/" in cake
    assert "clean_code_mode: info" in cake
    assert "public_html/lib/" in moodle
    assert "production_branch: main" in nest
    assert "clean_code_mode: block" in nest
    laravel = (projects["laravel-inertia-react"] / ".specify/hygiene.yml").read_text(encoding="utf-8")
    assert "storage/app/" in laravel
    assert "public/build/" in laravel


def test_d23_14_pre_commit_hook(projects: dict[str, Path]) -> None:
    hook = (projects["cakephp2-mysql"] / ".specify/templates/githooks/pre-commit").read_text(encoding="utf-8")
    assert "check-junk-files.sh" in hook
    assert (projects["cakephp2-mysql"] / ".specify/scripts/bash/check-junk-files.sh").is_file()


def test_d23_15_php_skill_and_typescript_untouched(projects: dict[str, Path]) -> None:
    for stack in ("cakephp2-mysql", "moodle3", "moodle5-plugin", "moodle5-portal", "laravel-inertia-react"):
        skill = projects[stack] / ".specify/presets" / f"mas-stack-{stack}" / "skills/clean-code-php/SKILL.md"
        assert skill.is_file(), stack
        assert "PHPMD" in skill.read_text(encoding="utf-8")
    digest = hashlib.sha256(TS_SKILL.read_bytes()).hexdigest()
    recorded = (REPO / "tests/fixtures/clean-code-typescript.sha256").read_text(encoding="utf-8").strip()
    assert digest == recorded


def test_d23_16_clean_diff_mode_and_baseline(tmp_path: Path) -> None:
    findings = _write(tmp_path / "findings.txt", "src/App.php:10:CyclomaticComplexity\n")
    baseline = _write(tmp_path / "baseline.txt", "src/App.php:10:CyclomaticComplexity\n")
    info = _bash(str(BASH / "check-clean-diff.sh"), "--mode", "info", "--findings", str(findings))
    assert info.returncode == 0
    assert "INFORMA" in info.stderr
    blocked = _bash(str(BASH / "check-clean-diff.sh"), "--mode", "block", "--findings", str(findings))
    assert blocked.returncode != 0
    known = _bash(
        str(BASH / "check-clean-diff.sh"),
        "--mode",
        "block",
        "--findings",
        str(findings),
        "--baseline",
        str(baseline),
    )
    assert known.returncode == 0, known.stderr


def test_d23_17_phpmd_and_laravel_eslint() -> None:
    rules = (REPO / "presets/mas-core/templates/phpmd.xml").read_text(encoding="utf-8")
    assert "CyclomaticComplexity" in rules
    eslint = (REPO / "presets/mas-stack-laravel-inertia-react/templates/eslint.clean.config.mjs").read_text(encoding="utf-8")
    assert "sonarjs/cognitive-complexity" in eslint
    assert "threshold" in (REPO / "presets/mas-core/templates/jscpd.json").read_text(encoding="utf-8")


def test_d23_18_moodle_entrypoint(tmp_path: Path) -> None:
    page = tmp_path / "local/demo/index.php"
    page.parent.mkdir(parents=True)
    page.write_text("<?php\necho 1;\n", encoding="utf-8")
    names = _write(tmp_path / "names.txt", "local/demo/index.php\n")
    bad = _bash(str(BASH / "check-moodle-entrypoints.sh"), "--names", str(names), "--root", str(tmp_path))
    assert bad.returncode != 0
    page.write_text("<?php\nrequire_login();\n", encoding="utf-8")
    ok = _bash(str(BASH / "check-moodle-entrypoints.sh"), "--names", str(names), "--root", str(tmp_path))
    assert ok.returncode == 0, ok.stderr


def test_d23_19_nestjs_reference() -> None:
    root = REPO / "presets/mas-stack-nestjs-react/reference"
    template = (root / ".github/PULL_REQUEST_TEMPLATE.md").read_text(encoding="utf-8")
    assert "Qué y por qué" in template
    assert ".DS_Store" in (root / ".gitignore").read_text(encoding="utf-8")
    owners = (root / ".github/CODEOWNERS").read_text(encoding="utf-8")
    assert "modules/auth/" in owners
    checker = (root / "scripts/check-commits.mjs").read_text(encoding="utf-8")
    assert 'startsWith("Merge ")' not in checker
    assert "check-junk-names.mjs" in (root / "package.json").read_text(encoding="utf-8")


def test_d23_20_stack_context(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        text = (project / ".specify/memory/stack-context.md").read_text(encoding="utf-8")
        assert "Principle XIII" in text, stack
        assert "check-hygiene.sh" in text, stack


def test_d23_21_clean_tools_run_on_new_lines(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    bindir = tmp_path / "bin"
    bindir.mkdir()
    phpmd = bindir / "phpmd"
    phpmd.write_text("#!/bin/sh\necho 'src/App.php:2:CyclomaticComplexity'\nexit 2\n", encoding="utf-8")
    phpmd.chmod(0o755)
    jscpd = bindir / "jscpd"
    jscpd.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    jscpd.chmod(0o755)
    monkeypatch.setenv("PATH", f"{bindir}{os.pathsep}{os.environ['PATH']}")
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "App.php").write_text("<?php\nfunction a(){ if(1){ if(1){} } }\n", encoding="utf-8")
    names = _write(tmp_path / "names.txt", "src/App.php\n")
    diff = _write(tmp_path / "diff.txt", "+++ b/src/App.php\n@@ -0,0 +2,1 @@\n+function a(){ if(1){ if(1){} } }\n")
    rules = tmp_path / ".specify" / "templates"
    rules.mkdir(parents=True)
    (rules / "phpmd.xml").write_text("<ruleset/>\n", encoding="utf-8")
    blocked = _write(tmp_path / "block.yml", 'clean_code_mode: block\nclean_langs:\n  - "php"\n')
    result = _bash(
        str(BASH / "check-clean-diff.sh"),
        "--config", str(blocked),
        "--names", str(names),
        "--diff", str(diff),
        "--root", str(tmp_path),
    )
    assert result.returncode == 1, result.stderr
    assert "hallazgos nuevos" in result.stderr
    informed = _write(tmp_path / "info.yml", 'clean_code_mode: info\nclean_langs:\n  - "php"\n')
    soft = _bash(
        str(BASH / "check-clean-diff.sh"),
        "--config", str(informed),
        "--names", str(names),
        "--diff", str(diff),
        "--root", str(tmp_path),
    )
    assert soft.returncode == 0, soft.stderr
    assert "INFORMA" in soft.stderr
    workflow = (REPO / "presets/mas-core/templates/ci/pr-hygiene.yml").read_text(encoding="utf-8")
    assert "phpmd" in workflow and "jscpd" in workflow
    eslint = (REPO / "presets/mas-stack-laravel-inertia-react/templates/eslint.clean.config.mjs").read_text(encoding="utf-8")
    assert "eslint-plugin-sonarjs" in eslint


def test_d23_22_nest_codeowners_are_merged(projects: dict[str, Path]) -> None:
    owners = (projects["nestjs-react"] / ".github" / "CODEOWNERS").read_text(encoding="utf-8")
    reference = (projects["nestjs-react"] / ".specify/reference/.github/CODEOWNERS").read_text(encoding="utf-8")
    assert "modules/auth/" in owners
    assert "throttle" in owners
    assert "casl" in owners
    assert "uploads" in owners
    assert "modules/auth/" in reference
    assert "app/Controller" in owners


def test_d23_23_template_comments_are_empty(tmp_path: Path) -> None:
    template = (REPO / "presets/mas-core/templates/github/PULL_REQUEST_TEMPLATE.md").read_text(encoding="utf-8")
    path = _write(tmp_path / "pr.md", template)
    result = _bash(str(BASH / "check-pr-body.sh"), "--evidence", str(path))
    assert result.returncode == 1
    assert "Cómo se validó" in result.stderr
    assert "Riesgos/rollback" in result.stderr


def test_d23_24_evidence_ignores_author_tag(tmp_path: Path) -> None:
    diff = _write(tmp_path / "diff.txt", "+++ b/src/User.php\n@@ -1 +1 @@\n+ * @author Ada\n")
    names = _write(tmp_path / "names.txt", "src/User.php\n")
    quiet = _bash(str(BASH / "check-pr-evidence.sh"), "--names", str(names), "--diff", str(diff), "--title", "feat(user): add profile page")
    assert quiet.returncode == 0
    assert "evidence" not in quiet.stdout
    auth = _write(tmp_path / "auth.txt", "src/auth/login.php\n")
    hit = _bash(str(BASH / "check-pr-evidence.sh"), "--names", str(auth), "--diff", str(diff), "--title", "feat(auth): add login form")
    assert "evidence" in hit.stdout
    workflow = (REPO / "presets/mas-core/templates/ci/pr-hygiene.yml").read_text(encoding="utf-8")
    assert "grep -Eiq 'auth|" not in workflow
    assert "check-pr-evidence.sh" in workflow


def test_d23_25_size_cap_blocks(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        text = (project / ".specify/hygiene.yml").read_text(encoding="utf-8")
        assert "h4_mode: block" in text, stack
        constitution = (project / ".specify/memory/constitution.md").read_text(encoding="utf-8")
        assert "1 500 changed lines blocks" in constitution, stack
        assert "warn mode" not in constitution, stack
    config = projects["cakephp2-mysql"] / ".specify/hygiene.yml"
    numstat = _write(projects["cakephp2-mysql"] / "numstat-d23.txt", "1600\t0\tsrc/App.php\n9000\t0\tvendor/lib.php\n")
    result = _bash(str(BASH / "check-pr-size.sh"), "--config", str(config), "--numstat", str(numstat))
    assert result.returncode == 1, result.stderr


def test_d23_26_hygiene_yml_is_quoted(projects: dict[str, Path]) -> None:
    for stack, project in projects.items():
        path = project / ".specify/hygiene.yml"
        raw = path.read_text(encoding="utf-8")
        loaded = yaml.safe_load(raw)
        assert isinstance(loaded["test_globs"], list), stack
        assert isinstance(loaded["size_excludes"], list), stack
        assert loaded["h4_mode"] == "block", stack
        assert '"' in raw, stack
    eslint = projects["laravel-inertia-react"] / "eslint.clean.config.mjs"
    assert eslint.is_file()
    assert "eslint-plugin-sonarjs" in eslint.read_text(encoding="utf-8")


def test_d23_27_gitleaks_is_limited_to_the_pr() -> None:
    workflow = (REPO / "presets/mas-core/templates/ci/security.yml").read_text(encoding="utf-8")
    assert "--log-opts" in workflow
    assert "PUSH_BEFORE" in workflow
    assert "base}..HEAD" in workflow


def test_d23_29_filehelper_reads_hygiene_assets() -> None:
    source = (REPO / "src/specify_cli/mas.py").read_text(encoding="utf-8")
    assert "semgrep_src.iterdir" not in source
    assert "gitignore-base\").read_text" not in source
    assert "files.iterdir(semgrep_src)" in source
    assert "files.read_text(core / \"templates\" / \"gitignore-base\")" in source

