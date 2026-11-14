"""Demo 6 gaps: CASL markers, env example, Vite proxy, and e2e ports."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
REFERENCE = REPO / "presets" / "mas-stack-nestjs-react" / "reference"
CHECK_CASL = REPO / "presets" / "mas-stack-nestjs-react" / "templates" / "check-casl.ts"


def _node() -> tuple[str, str]:
    node = shutil.which("node")
    npm = shutil.which("npm")
    if node is None or npm is None:
        pytest.skip("node and npm are required")
    return node, npm


def _install_typescript(tmp_path: Path, npm: str) -> None:
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


def _run_casl(root: Path, node: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [node, "--experimental-strip-types", "--no-warnings", str(root / "check-casl.ts")],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )


def test_check_casl_accepts_authenticated_http_and_rejects_a_bare_handler(tmp_path: Path) -> None:
    node, npm = _node()
    _install_typescript(tmp_path, npm)
    src = tmp_path / "apps" / "api" / "src"
    src.mkdir(parents=True)
    (src / "session.permissions.ts").write_text(
        'export const manifest = { category: "widgets", actions: [{ code: "crear" }] };\n',
        encoding="utf-8",
    )
    (src / "session.controller.ts").write_text(
        "\n".join(
            [
                "export class Session {",
                "  @Get()",
                "  @Authenticated()",
                "  list() {}",
                "  @Post()",
                "  @Can(\"widgets:crear\")",
                "  create() {}",
                "}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    (tmp_path / "check-casl.ts").write_bytes(CHECK_CASL.read_bytes())
    ok = _run_casl(tmp_path, node)
    assert ok.returncode == 0, ok.stderr
    assert "casl:check ok" in ok.stdout

    (src / "session.controller.ts").write_text(
        "export class Session {\n  @Get()\n  list() {}\n}\n",
        encoding="utf-8",
    )
    bare = _run_casl(tmp_path, node)
    assert bare.returncode == 1
    assert "lacks @Can, @Public, or @Authenticated" in bare.stderr


def test_env_example_lists_every_name_the_app_reads() -> None:
    node, _npm = _node()
    run = subprocess.run(
        [node, str(REFERENCE / "scripts" / "check-env-example.mjs")],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr
    assert "env-example ok" in run.stdout
    example = (REFERENCE / ".env.example").read_text(encoding="utf-8")
    for name in (
        "DATABASE_URL",
        "SEED_DATABASE_URL",
        "JWT_ACCESS_SECRET",
        "JWT_REFRESH_SECRET",
        "PORT",
        "API_PROXY_TARGET",
    ):
        assert f"{name}=" in example
    assert "replace-with" in example


def test_e2e_ports_discards_a_dead_listener() -> None:
    node, _npm = _node()
    run = subprocess.run(
        [node, "--experimental-strip-types", str(REFERENCE / "apps/web/e2e/ports.ts"), "--self-test"],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr
    assert "e2e-ports ok" in run.stdout


def test_slice_replacement_uses_authenticated_list_and_can_create(tmp_path: Path) -> None:
    node, _npm = _node()
    dest = tmp_path / "reference"
    shutil.copytree(
        REFERENCE,
        dest,
        ignore=shutil.ignore_patterns("node_modules", "dist", ".e2e-ports.json"),
    )
    run = subprocess.run(
        [node, str(dest / "scripts" / "replace-example-slice.mjs")],
        cwd=dest,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr
    controller = (dest / "apps/api/src/modules/widgets/widgets.controller.ts").read_text(encoding="utf-8")
    listed = controller.split("create(", 1)[0]
    assert "@Authenticated()" in listed
    assert '@Can("widgets:ver")' not in listed
    assert '@Can("widgets:crear")' in controller


def test_dev_proxy_check_passes_on_the_reference() -> None:
    node, _npm = _node()
    run = subprocess.run(
        [node, str(REFERENCE / "scripts" / "check-dev-proxy.mjs")],
        cwd=REFERENCE,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr
    assert "dev-proxy ok" in run.stdout


def test_specify_init_copies_env_example(tmp_path: Path) -> None:
    from typer.testing import CliRunner
    from specify_cli import app

    project = tmp_path / "proj"
    project.mkdir()
    subprocess.run(["git", "init", "-b", "main"], cwd=project, check=True, capture_output=True)
    result = CliRunner().invoke(
        app,
        [
            "init",
            str(project),
            "--integration",
            "cursor-agent",
            "--stack",
            "nestjs-react",
            "--ignore-agent-tools",
            "--script",
            "sh",
            "--skip-external-skills",
            "--non-interactive",
            "--force",
        ],
        catch_exceptions=False,
    )
    assert result.exit_code == 0, result.output
    copied = project / ".specify" / "reference" / ".env.example"
    assert copied.is_file()
    assert copied.read_bytes() == (REFERENCE / ".env.example").read_bytes()


def test_check_env_example_fails_when_a_read_is_undocumented(tmp_path: Path) -> None:
    node, _npm = _node()
    app = tmp_path / "apps" / "api" / "src"
    app.mkdir(parents=True)
    (app / "main.ts").write_text('const port = process.env["PORT"];\n', encoding="utf-8")
    (tmp_path / ".env.example").write_text("DATABASE_URL=postgresql://USER:PASSWORD@localhost/app\n", encoding="utf-8")
    script = tmp_path / "check-env-example.mjs"
    script.write_bytes((REFERENCE / "scripts" / "check-env-example.mjs").read_bytes())
    run = subprocess.run([node, str(script)], cwd=tmp_path, capture_output=True, text=True, check=False)
    assert run.returncode == 1
    assert "PORT" in run.stderr


def test_check_casl_rejects_mcp_tool_without_can(tmp_path: Path) -> None:
    node, npm = _node()
    _install_typescript(tmp_path, npm)
    src = tmp_path / "apps" / "api" / "src"
    src.mkdir(parents=True)
    (src / "tool.controller.ts").write_text(
        "\n".join(
            [
                "export class Tools {",
                "  @Tool({ name: \"list\", scopes: [\"widgets:ver\"] })",
                "  @Authenticated()",
                "  list() {}",
                "}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    (tmp_path / "check-casl.ts").write_bytes(CHECK_CASL.read_bytes())
    run = _run_casl(tmp_path, node)
    assert run.returncode == 1
    assert "MCP tool" in run.stderr
    assert "lacks @Can" in run.stderr
