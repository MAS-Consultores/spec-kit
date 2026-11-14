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
