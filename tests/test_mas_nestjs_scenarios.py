"""Scenario coverage for NestJS preset gaps 6–14.

Positive cases and the negative cases that must fail. Init without ``--stack``
stays a hard MAS error (no files written). The follow-up command list used by
the panel still keeps ``constitution`` for a non-MAS caller.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest
from typer.testing import CliRunner

from specify_cli import app
from specify_cli.mas_policy import (
    PRESET_ALLOW_BUILDS,
    PolicyError,
    active_lts_from_index,
    active_lts_from_text,
    analyze_tasks,
    feature_branch_status,
    fetch_active_lts,
    init_followup_commands,
    install_script_decision,
    is_prerelease,
    latest_stable,
    prisma7_node_disposition,
    specify_may_continue,
)

_REPO = Path(__file__).resolve().parents[1]
_OPTS = [
    "--ignore-agent-tools",
    "--script",
    "sh",
    "--skip-external-skills",
    "--non-interactive",
]
_COMPLETE_TASKS = """
# tasks
API e2e with supertest against real Postgres.
Cover 401, CASL 403, refresh rotation, and throttling 429.
MCP e2e with Bearer and scopes, one per tool.
Playwright plus axe for each user story. screenshot video trace off.
Unit test for each service, guard, and CASL policy.
"""


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)


def _init(project: Path, integration: str, *, force: bool = False) -> object:
    args = ["init", str(project), "--integration", integration, "--stack", "nestjs-react", *_OPTS]
    if force:
        args.append("--force")
    return CliRunner().invoke(app, args, catch_exceptions=False)


@pytest.mark.parametrize("integration", ["cursor-agent", "claude"])
@pytest.mark.parametrize("layout", ["empty", "git-only", "with-commits"])
def test_init_layouts_omit_constitution_step(tmp_path: Path, integration: str, layout: str):
    project = tmp_path / f"{integration}-{layout}"
    force = False
    if layout == "empty":
        pass
    else:
        project.mkdir()
        _git(project, "init")
        _git(project, "config", "user.email", "scenario@example.com")
        _git(project, "config", "user.name", "Scenario")
        if layout == "with-commits":
            (project / "README.md").write_text("existing\n", encoding="utf-8")
            _git(project, "add", "README.md")
            _git(project, "commit", "-m", "prior")
            force = True
    result = _init(project, integration, force=force)
    assert result.exit_code == 0, result.output
    output = result.output
    assert "Establish project principles" not in output
    assert "speckit.constitution" not in output
    assert "speckit-constitution" not in output
    assert "constitution.md" in output
    assert "specify" in output.lower()
    skills = (
        project / (".cursor" if integration == "cursor-agent" else ".claude") / "skills"
    )
    analyze = (skills / "speckit-analyze" / "SKILL.md").read_text(encoding="utf-8")
    tasks = (skills / "speckit-tasks" / "SKILL.md").read_text(encoding="utf-8")
    implement = (skills / "speckit-implement" / "SKILL.md").read_text(encoding="utf-8")
    context = (project / ".specify" / "memory" / "stack-context.md").read_text(encoding="utf-8")
    constitution = (project / ".specify" / "memory" / "constitution.md").read_text(encoding="utf-8")
    for blob in (analyze, tasks, implement, context, constitution):
        assert "supertest" in blob.lower() or "api-e2e" in blob.lower() or "API e2e" in blob or "supertest" in blob
    assert "@scarf/scarf" in context
    assert "start:e2e" in context
    assert "OPENAPI_GENERATE" in context
    assert "@modelcontextprotocol/client" in context
    assert "shadcn add" in context
    assert "console.warn" in context
    assert "api-e2e" in analyze or "supertest" in analyze


def test_constitution_pins_check_casl_to_typescript_5_9_3():
    text = (
        _REPO / "presets/mas-stack-nestjs-react/templates/constitution-template-append.md"
    ).read_text(encoding="utf-8")
    catalog = (_REPO / "docs/mas/stack-catalog.md").read_text(encoding="utf-8")
    for blob in (text, catalog):
        assert "5.9.3" in blob
        assert "createSourceFile" in blob
        assert "typescript@7" in blob or "TypeScript 7" in blob


def test_upstream_followups_still_list_constitution_when_no_stack():
    assert init_followup_commands(mas_stack=False)[0] == "constitution"
    assert "constitution" not in init_followup_commands(mas_stack=True)
    assert init_followup_commands(mas_stack=True) == (
        "specify",
        "plan",
        "tasks",
        "implement",
        "converge",
    )


def test_missing_stack_still_fails_before_writing(tmp_path: Path):
    project = tmp_path / "upstream"
    result = CliRunner().invoke(
        app,
        ["init", str(project), "--integration", "claude", *_OPTS],
        catch_exceptions=False,
    )
    assert result.exit_code == 1
    assert "approved stack" in result.output
    assert not project.exists()


def test_active_lts_skips_current_and_picks_newest():
    payload = [
        {"version": "v27.0.0", "lts": False},
        {"version": "v26.13.1", "lts": "Lithium"},
        {"version": "v24.11.0", "lts": "Krypton"},
        {"version": "v22.14.0", "lts": False},
    ]
    assert active_lts_from_index(payload) == ("26.13.1", 26)


def test_active_lts_prefers_a_newer_lts_inserted_first():
    payload = [
        {"version": "v28.1.0", "lts": "Future"},
        {"version": "v27.4.0", "lts": False},
        {"version": "v26.13.1", "lts": "Lithium"},
    ]
    assert active_lts_from_index(payload) == ("28.1.0", 28)


@pytest.mark.parametrize(
    "text",
    ["", "not-json", "{", "null", "\"v26.13.1\""],
)
def test_invalid_index_json_does_not_invent_a_version(text: str):
    with pytest.raises(PolicyError, match="refusing to guess"):
        active_lts_from_text(text)


def test_index_without_active_lts_fails():
    with pytest.raises(PolicyError, match="no Active LTS"):
        active_lts_from_index([{"version": "v27.0.0", "lts": False}])


def test_network_failure_does_not_invent_a_version():
    def _boom(_url: str) -> str:
        raise OSError("connection reset")

    with pytest.raises(PolicyError, match="failed to fetch"):
        fetch_active_lts("https://nodejs.org/dist/index.json", _boom)


def test_prisma7_node26_warns_but_node24_is_ok_and_node21_blocks():
    assert prisma7_node_disposition(26, 13) == "warn"
    assert prisma7_node_disposition(24, 11) == "ok"
    assert prisma7_node_disposition(22, 12) == "ok"
    assert prisma7_node_disposition(22, 11) == "block"
    assert prisma7_node_disposition(21, 0) == "block"
    assert prisma7_node_disposition(20, 19) == "ok"


@pytest.mark.parametrize(
    "version",
    [
        "8.0.0-rc.33",
        "7.11.0-beta.1",
        "7.11.0-alpha.2",
        "10.0.0-next.1",
        "12.0.0-canary.4",
        "9.0.0-dev.1",
    ],
)
def test_prerelease_suffixes_are_rejected(version: str):
    assert is_prerelease(version)


def test_latest_stable_skips_prisma8_rc_and_nest_pnpm_prereleases():
    assert latest_stable(
        ["8.0.0-rc.33", "7.11.0-beta.1", "7.10.1", "7.9.0"], major=7
    ) == "7.10.1"
    assert latest_stable(["12.0.0-rc.1", "11.1.0", "12.5.0"], major=12) == "12.5.0"
    assert latest_stable(["10.0.0-next.1", "9.15.0", "10.1.0"]) == "10.1.0"
    with pytest.raises(PolicyError, match="no stable"):
        latest_stable(["8.0.0-rc.33", "8.1.0-canary.1"], major=8)


def test_allow_builds_known_run_known_skip_and_unlisted_fail():
    assert install_script_decision("prisma", PRESET_ALLOW_BUILDS) == "run"
    assert install_script_decision("@prisma/engines", PRESET_ALLOW_BUILDS) == "run"
    assert install_script_decision("@scarf/scarf", PRESET_ALLOW_BUILDS) == "skip"
    assert install_script_decision("@new/install-script", PRESET_ALLOW_BUILDS) == "fail"
    assert install_script_decision("argon2", {"argon2": False}) == "skip"


def test_analyze_complete_tasks_have_no_critical_findings():
    assert analyze_tasks(_COMPLETE_TASKS) == []


@pytest.mark.parametrize(
    "dropped,finding",
    [
        ("supertest", "api-e2e"),
        ("Bearer", "mcp-e2e"),
        ("user story", "playwright"),
        ("CASL policy", "unit"),
    ],
)
def test_analyze_partial_tasks_are_critical(dropped: str, finding: str):
    text = _COMPLETE_TASKS.replace(dropped, "omitted")
    if dropped == "Bearer":
        text = text.replace("bearer", "omitted")
    missing = analyze_tasks(text)
    assert finding in missing
    assert len(missing) == 1


def test_feature_branch_gate_and_script_failure_stops_specify():
    assert feature_branch_status(head="001-login", feature_directory="specs/001-login") == "PASS"
    assert feature_branch_status(head="main", feature_directory="specs/001-login") == "HARD_FAIL"
    assert feature_branch_status(head="master", feature_directory="specs/001-login") == "HARD_FAIL"
    assert feature_branch_status(head="other", feature_directory="specs/001-login") == "HARD_FAIL"
    assert feature_branch_status(head="001-login", feature_directory=None) == "HARD_FAIL"
    assert specify_may_continue(script_exit_code=0) is True
    assert specify_may_continue(script_exit_code=1) is False


def test_plan_and_tasks_skills_hard_fail_on_main(tmp_path: Path):
    project = tmp_path / "skills"
    result = _init(project, "cursor-agent")
    assert result.exit_code == 0, result.output
    for name in ("speckit-plan", "speckit-tasks", "speckit-implement", "speckit-specify"):
        text = (project / ".cursor" / "skills" / name / "SKILL.md").read_text(encoding="utf-8")
        assert "HARD_FAIL" in text or "stop" in text.lower()
        if name != "speckit-specify":
            assert "main" in text
        else:
            assert "create-new-feature.sh" in text
            assert "by hand as a fallback" in text


def test_create_new_feature_creates_branch_files_and_failure_writes_nothing(tmp_path: Path):
    bash = shutil.which("bash")
    if bash is None:
        pytest.skip("bash is required")
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-b", "main")
    _git(repo, "config", "user.email", "scenario@example.com")
    _git(repo, "config", "user.name", "Scenario")
    (repo / "README.md").write_text("base\n", encoding="utf-8")
    _git(repo, "add", "README.md")
    _git(repo, "commit", "-m", "base")
    specify = repo / ".specify" / "scripts" / "bash"
    specify.mkdir(parents=True)
    for name in ("create-new-feature.sh", "common.sh"):
        target = specify / name
        target.write_bytes((_REPO / "scripts" / "bash" / name).read_bytes())
        target.chmod(0o755)
    (repo / ".specify" / "templates").mkdir()
    (repo / ".specify" / "templates" / "spec-template.md").write_text("# spec\n", encoding="utf-8")
    script = specify / "create-new-feature.sh"
    ok = subprocess.run(
        [bash, str(script), "--json", "--short-name", "user-login", "Add user login"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert ok.returncode == 0, ok.stderr
    payload = json.loads(ok.stdout)
    branch = payload["BRANCH_NAME"]
    assert branch.endswith("user-login")
    assert (repo / "specs" / branch / "spec.md").is_file()
    assert specify_may_continue(script_exit_code=ok.returncode)
    head = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=True,
    )
    assert feature_branch_status(
        head=head.stdout.strip(), feature_directory=f"specs/{branch}"
    ) == "PASS"

    before = {path.name for path in (repo / "specs").iterdir()}
    bad = subprocess.run(
        [bash, str(script), "--json", "--short-name", "nope", "   "],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    assert bad.returncode != 0
    assert specify_may_continue(script_exit_code=bad.returncode) is False
    assert {path.name for path in (repo / "specs").iterdir()} == before


def test_check_casl_tool_shapes(tmp_path: Path):
    node = shutil.which("node")
    npm = shutil.which("npm")
    if node is None or npm is None:
        pytest.skip("node and npm are required")
    app_src = tmp_path / "apps" / "api" / "src"
    app_src.mkdir(parents=True)
    (app_src / "clientes.permissions.ts").write_text(
        """
export const manifest = {
  category: "clientes",
  actions: [
    { code: "ver", reserved: false },
    { code: "crear", reserved: false },
    { code: "restaurar", reserved: true },
  ],
};
""",
        encoding="utf-8",
    )
    (app_src / "clientes.mcp.ts").write_text(
        """
export class ClientesMcp {
  @Tool({ name: "list", scopes: ["clientes:ver"] })
  @Can("clientes:ver")
  list() {}

  @Tool({ name: "bare" })
  @Can("clientes:crear")
  bare() {}
}
""",
        encoding="utf-8",
    )
    script = tmp_path / "check-casl.ts"
    script.write_bytes(
        (_REPO / "presets/mas-stack-nestjs-react/templates/check-casl.ts").read_bytes()
    )
    install = subprocess.run(
        [npm, "install", "--silent", "typescript@5.9.3"],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
        env={**os.environ, "npm_config_fund": "false"},
    )
    if install.returncode != 0:
        pytest.fail(install.stderr or install.stdout)
    run = subprocess.run(
        [node, "--experimental-strip-types", "--no-warnings", str(script)],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 1, run.stdout + run.stderr
    err = run.stderr
    assert "scopes do not include" in err
    assert "clientes:crear" in err
    assert "unused manifest action" not in err or "clientes:ver" not in err
    # ver is used; crear is declared and used via @Can but the tool has no scopes,
    # so the scope mismatch is the failure. Unused reserved restaurar is ignored.
    assert "restaurar" not in err


def test_check_casl_flags_unused_action_and_accepts_scoped_tool(tmp_path: Path):
    node = shutil.which("node")
    npm = shutil.which("npm")
    if node is None or npm is None:
        pytest.skip("node and npm are required")
    if not (tmp_path / "node_modules" / "typescript").exists():
        install = subprocess.run(
            [npm, "install", "--silent", "typescript@5.9.3"],
            cwd=tmp_path,
            capture_output=True,
            text=True,
            check=False,
        )
        if install.returncode != 0:
            pytest.fail(install.stderr or install.stdout)
    good = tmp_path / "good"
    src = good / "apps" / "api" / "src"
    src.mkdir(parents=True)
    (src / "ok.permissions.ts").write_text(
        """
export const manifest = {
  category: "clientes",
  actions: [{ code: "ver" }, { code: "restaurar", reserved: true }],
};
""",
        encoding="utf-8",
    )
    (src / "ok.mcp.ts").write_text(
        """
export class Ok {
  @Tool({ name: "list", scopes: ["clientes:ver"] })
  @Can("clientes:ver")
  list() {}
}
""",
        encoding="utf-8",
    )
    script_src = _REPO / "presets/mas-stack-nestjs-react/templates/check-casl.ts"
    (good / "check-casl.ts").write_bytes(script_src.read_bytes())
    os.symlink(tmp_path / "node_modules", good / "node_modules")
    ok = subprocess.run(
        [node, "--experimental-strip-types", "--no-warnings", str(good / "check-casl.ts")],
        cwd=good,
        capture_output=True,
        text=True,
        check=False,
    )
    assert ok.returncode == 0, ok.stderr
    assert "casl:check ok" in ok.stdout

    src.joinpath("ok.permissions.ts").write_text(
        """
export const manifest = {
  category: "clientes",
  actions: [{ code: "ver" }, { code: "exportar" }],
};
""",
        encoding="utf-8",
    )
    unused = subprocess.run(
        [node, "--experimental-strip-types", "--no-warnings", str(good / "check-casl.ts")],
        cwd=good,
        capture_output=True,
        text=True,
        check=False,
    )
    assert unused.returncode == 1
    assert "unused manifest action 'clientes:exportar'" in unused.stderr
    assert "clientes:ver" not in unused.stderr
