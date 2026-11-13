"""Implementation of ``specify bundle add``."""

from __future__ import annotations

import typer

from ._commands import bundle_app
from .command_install import bundle_install


@bundle_app.command("add")
def bundle_add(
    bundle_id: str = typer.Argument(
        ...,
        help="Bundle id (from the catalog stack) or a local path to a .zip "
        "artifact, bundle directory, or bundle.yml",
    ),
    integration: str = typer.Option(None, "--integration", help="Override integration"),
    offline: bool = typer.Option(False, "--offline", help="Do not access the network"),
    mas_stack: str | None = typer.Option(None, "--stack", help="Approved MAS stack for a new project"),
    skip_external_skills: bool = typer.Option(False, "--skip-external-skills", help="Skip external skill downloads during init"),
    refresh: bool = typer.Option(
        False,
        "--refresh",
        help="Refresh owned components from this bundle source",
    ),
    version: str | None = typer.Option(
        None,
        "--version",
        help="Install an exact bundle release from the catalog",
    ),
) -> None:
    """Install a bundle's full component set (alias for install)."""
    bundle_install(
        bundle_id=bundle_id,
        integration=integration,
        offline=offline,
        refresh=refresh,
        version=version,
        mas_stack=mas_stack,
        skip_external_skills=skip_external_skills,
    )
