"""Demo 5 gaps: branch check, migration URL, and the tasks skill."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from tests.conftest import requires_bash

REPO = Path(__file__).resolve().parents[1]
HAS_PWSH = shutil.which("pwsh") is not None
REFERENCE = REPO / "presets" / "mas-stack-nestjs-react" / "reference"


def _run(cmd: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False)


def test_symbolic_ref_reads_unborn_branch() -> None:
    repo = Path(subprocess.check_output(["mktemp", "-d"], text=True).strip())
    try:
        init = _run(["git", "init", "-b", "main", str(repo)])
        assert init.returncode == 0, init.stderr
        short = _run(["git", "-C", str(repo), "symbolic-ref", "--short", "HEAD"])
        assert short.returncode == 0
        assert short.stdout.strip() == "main"
        rev = _run(["git", "-C", str(repo), "rev-parse", "--abbrev-ref", "HEAD"])
        assert rev.returncode == 128
    finally:
        shutil.rmtree(repo, ignore_errors=True)


@pytest.mark.skipif(not HAS_PWSH, reason="pwsh is not installed")
def test_symbolic_ref_reads_unborn_branch_on_powershell() -> None:
    script = r"""
$d = Join-Path ([System.IO.Path]::GetTempPath()) ("speckit-d5-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Path $d | Out-Null
git init -b main $d | Out-Null
$short = git -C $d symbolic-ref --short HEAD
if ($short -ne "main") { exit 2 }
$PSNativeCommandUseErrorActionPreference = $false
git -C $d rev-parse --abbrev-ref HEAD 2>$null | Out-Null
if ($LASTEXITCODE -ne 128) { exit 3 }
Remove-Item -Recurse -Force $d
exit 0
"""
    result = _run(["pwsh", "-NoProfile", "-Command", script])
    assert result.returncode == 0, result.stdout + result.stderr


def test_branch_skills_use_symbolic_ref() -> None:
    specify = (REPO / "presets/mas-core/commands/speckit.specify.md").read_text(encoding="utf-8")
    implement = (REPO / "presets/mas-core/commands/speckit.implement.md").read_text(encoding="utf-8")
    validate = (REPO / "extensions/git/commands/speckit.git.validate.md").read_text(encoding="utf-8")
    for text in (specify, implement, validate):
        assert "git symbolic-ref --short HEAD" in text
        assert "rev-parse --abbrev-ref HEAD" in text
        assert "128" in text
    bash = (REPO / "extensions/git/scripts/bash/create-new-feature-branch.sh").read_text(encoding="utf-8")
    ps = (REPO / "extensions/git/scripts/powershell/create-new-feature-branch.ps1").read_text(encoding="utf-8")
    assert "symbolic-ref --short HEAD" in bash
    assert "symbolic-ref --short HEAD" in ps
    assert "rev-parse --abbrev-ref HEAD" not in bash
    assert "rev-parse --abbrev-ref HEAD" not in ps


def test_migration_url_ignores_blank_and_seed() -> None:
    helper = REFERENCE / "apps/api/prisma/database-url.mjs"
    config = (REFERENCE / "apps/api/prisma.config.ts").read_text(encoding="utf-8")
    assert "SEED_DATABASE_URL" not in config
    assert "migrationDatabaseUrl" in config
    probe = r"""
import { migrationDatabaseUrl, seedDatabaseUrl } from %s;
const app = "postgresql://postgres@127.0.0.1:5432/app";
const e2e = "postgresql://postgres@127.0.0.1:5432/e2e";
if (migrationDatabaseUrl({ DATABASE_URL: app, SEED_DATABASE_URL: e2e }) !== app) process.exit(2);
for (const blank of ["", "   "]) {
  let failed = false;
  try { migrationDatabaseUrl({ DATABASE_URL: blank, SEED_DATABASE_URL: e2e }); }
  catch { failed = true; }
  if (!failed) process.exit(3);
  failed = false;
  try { seedDatabaseUrl({ DATABASE_URL: app, SEED_DATABASE_URL: blank }); }
  catch { failed = true; }
  if (!failed) process.exit(4);
}
if (seedDatabaseUrl({ DATABASE_URL: app, SEED_DATABASE_URL: e2e }) !== e2e) process.exit(5);
let same = false;
try { seedDatabaseUrl({ DATABASE_URL: app, SEED_DATABASE_URL: app }); }
catch { same = true; }
if (!same) process.exit(6);
console.log("ok");
""" % json.dumps(helper.as_uri())
    result = _run(["node", "--input-type=module", "-e", probe])
    assert result.returncode == 0, result.stdout + result.stderr


def test_tasks_skill_uses_the_lockfile_not_npm_view() -> None:
    tasks = (REPO / "presets/mas-stack-nestjs-react/commands/speckit.tasks.md").read_text(encoding="utf-8")
    template = (REPO / "presets/mas-core/templates/tasks-template.md").read_text(encoding="utf-8")
    checklist = (REPO / "presets/mas-stack-nestjs-react/templates/mas-stack-nestjs-react.md").read_text(encoding="utf-8")
    for text in (tasks, template, checklist):
        assert "pnpm-lock.yaml" in text
        assert "Do not run `npm view`" in text
        assert "npm view <pkg>" not in text
        assert "resolved with `npm view`" not in text


@requires_bash
def test_replace_slice_removes_note_from_infrastructure(tmp_path: Path) -> None:
    dest = tmp_path / "app"
    shutil.copytree(REFERENCE, dest, ignore=shutil.ignore_patterns("node_modules"))
    replaced = _run(["node", str(dest / "scripts" / "replace-example-slice.mjs")])
    assert replaced.returncode == 0, replaced.stderr
    checked = _run(["node", str(dest / "scripts" / "check-no-note-in-infra.mjs")])
    assert checked.returncode == 0, checked.stderr
    schema = (dest / "apps/api/prisma/schema.prisma").read_text(encoding="utf-8")
    assert "model Widget" in schema
    assert "model Note" not in schema
    widget_sql = dest / "apps/api/prisma/migrations/20261114000000_widget/migration.sql"
    assert 'CREATE TABLE "Widget"' in widget_sql.read_text(encoding="utf-8")
    init_sql = (dest / "apps/api/prisma/migrations/20261113000000_init/migration.sql").read_text(encoding="utf-8")
    assert '"Note"' not in init_sql
    assert not (dest / "apps/api/src/modules/notes").exists()
    assert (dest / "apps/api/src/modules/widgets/widgets.controller.ts").is_file()
