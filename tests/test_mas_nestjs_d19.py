"""Regresión D19: el gate de mutación mide el diff ya commiteado."""

from __future__ import annotations

import json
import os
import platform
import shutil
import stat
import subprocess
import tarfile
import urllib.request
from pathlib import Path

import pytest
import yaml

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
    return {key: value for key, value in os.environ.items() if key not in {"GITHUB_BASE_REF", "CI"}}


def _node(args: list[str], cwd: Path, *, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=_clean_env(),
        input=input_text,
        check=False,
    )


def _init(repo: Path) -> None:
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "d19@invalid.test")
    _git(repo, "config", "user.name", "d19")


def _commit(repo: Path, message: str) -> None:
    _git(repo, "add", ".")
    _git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", message)


GITLEAKS_VERSION = "8.24.3"
ACCESS_KEY = "AKIAA1B2C3D4E5F6G7H8"
SECRET_KEY = "abcdefghijklmnopqrstuvwxyz0123456789ABCD"


def _gitleaks_archive() -> str:
    machine = platform.machine().lower()
    system = platform.system().lower()
    if system == "linux" and machine in {"x86_64", "amd64"}:
        return f"gitleaks_{GITLEAKS_VERSION}_linux_x64.tar.gz"
    if system == "linux" and machine in {"aarch64", "arm64"}:
        return f"gitleaks_{GITLEAKS_VERSION}_linux_arm64.tar.gz"
    return ""


def _gitleaks_bin() -> Path:
    found = shutil.which("gitleaks")
    if found:
        version = subprocess.run([found, "version"], capture_output=True, text=True, check=False)
        if version.returncode == 0 and version.stdout.strip().startswith("8.24."):
            return Path(found)
    archive = _gitleaks_archive()
    if not archive:
        pytest.skip("gitleaks 8.24.x no está en este runner")
    dest = Path("/tmp") / f"gitleaks-{GITLEAKS_VERSION}"
    binary = dest / "gitleaks"
    if not binary.exists():
        dest.mkdir(parents=True, exist_ok=True)
        url = f"https://github.com/gitleaks/gitleaks/releases/download/v{GITLEAKS_VERSION}/{archive}"
        blob = dest / archive
        try:
            urllib.request.urlretrieve(url, blob)
            with tarfile.open(blob) as packed:
                try:
                    packed.extract("gitleaks", dest, filter="data")
                except TypeError:
                    packed.extract("gitleaks", dest)
        except (OSError, tarfile.TarError, urllib.error.URLError) as error:
            pytest.fail(f"en Linux gitleaks {GITLEAKS_VERSION} tiene que instalarse: {error}")
        binary.chmod(binary.stat().st_mode | stat.S_IEXEC)
    version = subprocess.run([str(binary), "version"], capture_output=True, text=True, check=False)
    if version.returncode != 0 or not version.stdout.strip().startswith("8.24."):
        pytest.fail(f"gitleaks no quedó en 8.24.x: {version.stdout} {version.stderr}")
    return binary


def test_d19_02_gitleaks_rejects_committed_aws_secrets(tmp_path: Path) -> None:
    binary = _gitleaks_bin()
    assert len(SECRET_KEY) == 40
    assert ACCESS_KEY != "AKIAIOSFODNN7EXAMPLE"
    assert "EXAMPLEKEY" not in SECRET_KEY
    repo = tmp_path / "repo"
    _init(repo)
    (repo / ".gitleaks.toml").write_text((REFERENCE / ".gitleaks.toml").read_text(encoding="utf-8"), encoding="utf-8")
    (repo / "leak.ts").write_text(
        f'export const key = "{ACCESS_KEY}";\nexport const aws_secret_access_key = "{SECRET_KEY}";\n',
        encoding="utf-8",
    )
    _commit(repo, "leak")
    result = subprocess.run(
        [str(binary), "detect", "--config", ".gitleaks.toml", "--exit-code", "1", "--redact", "--no-banner"],
        cwd=repo,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    assert result.returncode != 0, result.stdout
    assert "leaks found: 2" in result.stderr or "leaks found: 2" in result.stdout


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

    result = _node([str(REFERENCE / "scripts" / "check-public-api.mjs")], repo)
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

    result = _node([str(REFERENCE / "scripts" / "check-size-budget.mjs")], repo)
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
    diff = subprocess.run(
        ["git", "diff", "-U0", "--no-ext-diff", "HEAD^", "HEAD"],
        cwd=repo,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
    )
    diff_text = diff.stdout.replace("\\", "/").replace("\r\n", "\n")
    assert "apps/api/src/miss.ts" in diff_text
    diff_path = tmp_path / "miss.diff"
    diff_path.write_text(diff_text, encoding="utf-8", newline="\n")

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
const diff = readFileSync(process.argv[2], "utf8");
const mod = await import(pathToFileURL(process.argv[1]));
const result = mod.coverageRatio(
  "SF:apps/api/src/other.ts\\nDA:1,1\\nend_of_record\\n",
  diff,
  0.8,
);
process.stdout.write(JSON.stringify({ ok: result.ok, lineTotal: result.lineTotal ?? 0 }));
"""
    result = _node(["--input-type=module", "-e", probe, str(module), str(diff_path)], repo)
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert payload["ok"] is False
    assert payload["lineTotal"] >= 1


def test_d19_06_bundle_over_the_limit_fails_the_gate(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / "package.json").write_text(
        json.dumps({"private": True, "devDependencies": {"size-limit": "14.3.0", "@size-limit/file": "14.3.0"}}),
        encoding="utf-8",
    )
    (repo / "quality-gates.json").write_text("{}\n", encoding="utf-8")
    (repo / ".size-limit.json").write_text(
        '[{"name":"web initial","path":"apps/web/dist/assets/*.js","limit":"500 kB"}]\n',
        encoding="utf-8",
    )
    bundle = repo / "apps" / "web" / "dist" / "assets" / "index.js"
    bundle.parent.mkdir(parents=True)
    bundle.write_bytes(os.urandom(800 * 1024))
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if npm is None:
        program = Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "nodejs" / "npm.cmd"
        npm = str(program) if program.exists() else ""
    if not npm:
        if platform.system() == "Linux":
            pytest.fail("en Linux npm tiene que estar para instalar size-limit 14.3.0")
        pytest.skip("npm no está en este runner y size-limit 14.3.0 no se puede instalar")
    install = subprocess.run(
        [npm, "install", "--ignore-scripts", "--no-audit", "--no-fund"],
        cwd=repo,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    assert install.returncode == 0, install.stderr
    result = _node([str(REFERENCE / "scripts" / "check-size-budget.mjs")], repo)
    assert result.returncode != 0, result.stdout
    combined = f"{result.stdout}\n{result.stderr}"
    assert "exceeded" in combined


def test_d19_07_ci_without_dist_fails_and_the_workflow_builds_first(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / "quality-gates.json").write_text("{}\n", encoding="utf-8")
    (repo / ".size-limit.json").write_text(
        '[{"name":"web initial","path":"apps/web/dist/assets/*.js","limit":"500 kB"}]\n',
        encoding="utf-8",
    )
    env = _clean_env()
    env["CI"] = "true"
    result = subprocess.run(
        ["node", str(REFERENCE / "scripts" / "check-size-budget.mjs")],
        cwd=repo,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
        check=False,
    )
    assert result.returncode != 0, result.stdout
    assert "apps/web/dist" in result.stderr

    document = yaml.safe_load((REFERENCE / ".github" / "workflows" / "diff-quality.yml").read_text(encoding="utf-8"))
    steps = document["jobs"]["diff-quality"]["steps"]
    build_at = None
    gate_at = None
    for index, step in enumerate(steps):
        lines = [line.strip() for line in str(step.get("run") or "").splitlines() if line.strip()]
        if "pnpm build" in lines:
            build_at = index
        if any(line.split()[:2] == ["node", "scripts/check-size-budget.mjs"] or line.startswith("node scripts/check-size-budget.mjs") for line in lines):
            gate_at = index
    assert build_at is not None
    assert gate_at is not None
    assert build_at < gate_at


def test_d19_08_mutation_job_is_blocking_and_verify_skips_stryker(tmp_path: Path) -> None:
    workflow_path = REFERENCE / ".github" / "workflows" / "diff-quality.yml"
    raw = workflow_path.read_text(encoding="utf-8")
    document = yaml.safe_load(raw)
    trigger = document.get("on", document.get(True))
    assert isinstance(trigger, dict)
    assert "pull_request" in trigger
    job = document["jobs"]["mutation"]
    assert job.get("continue-on-error") in (None, False)
    assert "if" not in job
    runs = []
    for step in job["steps"]:
        assert step.get("continue-on-error") in (None, False)
        if step.get("run"):
            runs.append(str(step["run"]))
    command = "node scripts/check-mutation.mjs --run"
    assert any(command in run for run in runs)
    checkout = next(step for step in job["steps"] if str(step.get("uses", "")).startswith("actions/checkout"))
    assert checkout["with"]["fetch-depth"] == 0
    package = json.loads((REFERENCE / "package.json").read_text(encoding="utf-8"))
    verify = package["scripts"]["verify"]
    assert "check-mutation.mjs --run" not in verify
    assert "check-mutation.mjs --self-test" in verify
    assert "continue-on-error" not in raw.split("mutation:", 1)[1]

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
    _git(repo, "update-ref", "refs/remotes/origin/main", "HEAD")
    _git(repo, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
    empty = subprocess.run(
        ["node", str(SCRIPT), "--run"],
        cwd=repo,
        capture_output=True,
        text=True,
        env=_clean_env(),
        check=False,
    )
    assert empty.returncode == 0, empty.stderr
    assert "mutation: sin archivos mutables en el diff (base " in empty.stdout
    service = repo / "apps/api/src/modules/auth/auth.service.ts"
    service.parent.mkdir(parents=True)
    service.write_text("export const value = 1;\n", encoding="utf-8")
    _git(repo, "add", ".")
    _git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "feature")
    if os.name == "nt":
        return
    bindir = repo / "bin"
    bindir.mkdir()
    log = repo / "pnpm.log"
    (bindir / "pnpm").write_text(
        "#!/bin/sh\n"
        "printf '%s\\n' \"$*\" >> \"$PNPM_LOG\"\n"
        "mkdir -p reports/mutation\n"
        "printf '%s\\n' '{\"files\":{\"src/a.ts\":{\"mutants\":[{\"status\":\"Killed\",\"coveredBy\":[\"t\"]}]}}}' > reports/mutation/mutation.json\n"
        "exit 0\n",
        encoding="utf-8",
    )
    (bindir / "pnpm").chmod(0o755)
    env = _clean_env()
    env["PATH"] = f"{bindir}{os.pathsep}{env.get('PATH', '')}"
    env["PNPM_LOG"] = str(log)
    ran = subprocess.run(
        ["node", str(SCRIPT), "--run"],
        cwd=repo,
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    assert ran.returncode == 0, ran.stdout + ran.stderr
    assert "sin archivos mutables" not in ran.stdout
    assert "exec stryker run" in log.read_text(encoding="utf-8")


def _workflow_permissions(document: object) -> bool:
    if not isinstance(document, dict):
        return False
    permissions = document.get("permissions")
    if isinstance(permissions, dict) and permissions.get("contents") == "read":
        return True
    jobs = document.get("jobs")
    if not isinstance(jobs, dict) or not jobs:
        return False
    for job in jobs.values():
        job_permissions = job.get("permissions") if isinstance(job, dict) else None
        if not isinstance(job_permissions, dict) or job_permissions.get("contents") != "read":
            return False
    return True


def test_d19_09_failed_diff_missing_base_permissions_and_incremental(tmp_path: Path) -> None:
    repo = tmp_path / "one"
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "mutation@example.com")
    _git(repo, "config", "user.name", "mutation")
    (repo / "quality-gates.json").write_text(
        json.dumps({"mutation": {"modules": ["auth"], "threshold": 80, "paths": {"auth": "apps/api/src/modules/auth"}}}),
        encoding="utf-8",
    )
    service = repo / "apps/api/src/modules/auth/auth.service.ts"
    service.parent.mkdir(parents=True)
    service.write_text("export const value = 1;\n", encoding="utf-8")
    _git(repo, "add", ".")
    _git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "only")
    alone = subprocess.run(["node", str(SCRIPT)], cwd=repo, capture_output=True, text=True, env=_clean_env(), check=False)
    assert alone.returncode != 0, alone.stdout
    assert "sin archivos mutables" not in alone.stdout
    assert "sin base" in alone.stderr

    if os.name == "nt":
        workflows = REFERENCE / ".github" / "workflows"
        for path in workflows.glob("*.yml"):
            document = yaml.safe_load(path.read_text(encoding="utf-8"))
            assert _workflow_permissions(document), path.name
        return

    seeded = tmp_path / "seeded"
    seeded.mkdir()
    _git(seeded, "init", "-q", "-b", "main")
    _git(seeded, "config", "user.email", "mutation@example.com")
    _git(seeded, "config", "user.name", "mutation")
    (seeded / "quality-gates.json").write_text((repo / "quality-gates.json").read_text(encoding="utf-8"), encoding="utf-8")
    _git(seeded, "add", "quality-gates.json")
    _git(seeded, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "base")
    auth = seeded / "apps/api/src/modules/auth/auth.service.ts"
    auth.parent.mkdir(parents=True)
    auth.write_text("export const value = 1;\n", encoding="utf-8")
    _git(seeded, "add", ".")
    _git(seeded, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "feature")
    _git(seeded, "update-ref", "refs/remotes/origin/main", "HEAD~1")
    _git(seeded, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
    bindir = tmp_path / "bin"
    bindir.mkdir()
    git_stub = bindir / "git"
    git_stub.write_text(
        "#!/bin/sh\n"
        "for arg in \"$@\"; do\n"
        "  if [ \"$arg\" = diff ]; then echo diff-roto >&2; exit 1; fi\n"
        "done\n"
        "exec /usr/bin/git \"$@\"\n",
        encoding="utf-8",
    )
    git_stub.chmod(0o755)
    env = _clean_env()
    env["PATH"] = f"{bindir}{os.pathsep}{env.get('PATH', '')}"
    broken = subprocess.run(["node", str(SCRIPT)], cwd=seeded, capture_output=True, text=True, env=env, check=False)
    assert broken.returncode != 0, broken.stdout
    assert "sin archivos mutables" not in broken.stdout
    assert "diff-roto" in broken.stderr

    probe = tmp_path / "probe.mjs"
    probe.write_text(
        "import { diffNames } from " + json.dumps(str(REFERENCE / "scripts" / "lib" / "diff-base.mjs")) + ";\n"
        "try { diffNames(process.cwd(), 'HEAD', 'ACMR'); console.log('swallowed'); }\n"
        "catch (error) { console.error(error.stderr || error.message); process.exit(2); }\n",
        encoding="utf-8",
    )
    swallowed = subprocess.run(["node", str(probe)], cwd=seeded, capture_output=True, text=True, env=env, check=False)
    assert swallowed.returncode == 2, swallowed.stdout
    assert "diff-roto" in swallowed.stderr

    workflows = REFERENCE / ".github" / "workflows"
    for path in workflows.glob("*.yml"):
        document = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert _workflow_permissions(document), path.name
    quality = yaml.safe_load((workflows / "diff-quality.yml").read_text(encoding="utf-8"))
    cache = next(step for step in quality["jobs"]["mutation"]["steps"] if step.get("uses", "").startswith("actions/cache"))
    assert "apps/api/src/**/*.ts" in cache["with"]["key"]

    if os.name == "nt":
        return
    covered = tmp_path / "covered"
    covered.mkdir()
    _git(covered, "init", "-q", "-b", "main")
    _git(covered, "config", "user.email", "mutation@example.com")
    _git(covered, "config", "user.name", "mutation")
    (covered / "quality-gates.json").write_text((repo / "quality-gates.json").read_text(encoding="utf-8"), encoding="utf-8")
    _git(covered, "add", "quality-gates.json")
    _git(covered, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "base")
    target = covered / "apps/api/src/modules/auth/auth.service.ts"
    target.parent.mkdir(parents=True)
    target.write_text("export const value = 1;\n", encoding="utf-8")
    _git(covered, "add", ".")
    _git(covered, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "feature")
    _git(covered, "update-ref", "refs/remotes/origin/main", "HEAD~1")
    _git(covered, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
    pnpm_dir = tmp_path / "pnpm-bin"
    pnpm_dir.mkdir()
    count = tmp_path / "count"
    (pnpm_dir / "pnpm").write_text(
        "#!/bin/sh\n"
        "n=0\n"
        "if [ -f \"$COUNT\" ]; then n=$(cat \"$COUNT\"); fi\n"
        "n=$((n+1))\n"
        "printf '%s' \"$n\" > \"$COUNT\"\n"
        "mkdir -p reports/mutation\n"
        "if [ \"$n\" = 1 ]; then\n"
        "  printf '%s\\n' '{\"files\":{\"src/a.ts\":{\"mutants\":[{\"status\":\"Killed\"}]}}}' > reports/mutation/mutation.json\n"
        "else\n"
        "  printf '%s\\n' '{\"files\":{\"src/a.ts\":{\"mutants\":[{\"status\":\"Killed\",\"coveredBy\":[\"t\"]}]}}}' > reports/mutation/mutation.json\n"
        "fi\n"
        "exit 0\n",
        encoding="utf-8",
    )
    (pnpm_dir / "pnpm").chmod(0o755)
    (covered / "apps/api/.stryker-incremental.json").write_text("{}\n", encoding="utf-8")
    run_env = _clean_env()
    run_env["PATH"] = f"{pnpm_dir}{os.pathsep}{run_env.get('PATH', '')}"
    run_env["COUNT"] = str(count)
    retried = subprocess.run(["node", str(SCRIPT), "--run"], cwd=covered, capture_output=True, text=True, env=run_env, check=False)
    assert retried.returncode == 0, retried.stdout + retried.stderr
    assert count.read_text(encoding="utf-8") == "2"
    assert "se descarta el incremental" in retried.stderr
