"""MAS initialization hooks for ``specify init``.

Kept beside ``command_init`` so future upstream merges only reattach a few
call sites instead of replaying the stack workflow inside the init command.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import typer

from ._assets import _locate_bundled_preset, get_speckit_version
from ._console import StepTracker, console
from .mas import (
    MasStack,
    example_stack_init_command,
    format_valid_stack_ids,
    get_mas_stack,
    write_stack_memory_files,
)
from .stack_skills import (
    external_skills_to_init_payload,
    install_stack_external_skills,
    pending_external_skills_payload,
    render_external_skills_failure_panel,
    render_external_skills_summary_panel,
    resolve_stack_external_skills,
    write_external_skills_status,
)


ALLOW_STACKLESS_ENV = "SPECIFY_ALLOW_STACKLESS"
ALLOW_STACKLESS = False


def _stackless_allowed() -> bool:
    """Return True for the maintainer escape, including in-process CLI tests."""
    return ALLOW_STACKLESS or os.environ.get(ALLOW_STACKLESS_ENV) == "1"


def require_mas_stack(stack: str | None, preset: str | None) -> MasStack | None:
    """Validate ``--stack`` before ``init`` creates or writes a project.

    ``SPECIFY_ALLOW_STACKLESS=1`` is a maintainer-only escape for upstream
    tests and preset development. It does not install MAS presets or write
    stack memory. Shipping initialization still requires ``--stack``.
    """
    if not stack and _stackless_allowed():
        return None

    if not stack:
        console.print("[red]Error:[/red] MAS initialization requires an approved stack.")
        console.print(f"[yellow]Valid stack IDs:[/yellow] {format_valid_stack_ids()}")
        console.print(f"[yellow]Example:[/yellow] {example_stack_init_command()}")
        raise typer.Exit(1)

    if preset:
        console.print(
            "[red]Error:[/red] --stack and --preset are mutually exclusive in the MAS fork."
        )
        console.print(
            "[yellow]Stack selection already drives bundled preset composition "
            "(`mas-core` + `mas-stack-<stack-id>`).[/yellow]"
        )
        console.print(
            "[yellow]Additional preset composition requires a later explicit design.[/yellow]"
        )
        raise typer.Exit(1)

    mas_stack = get_mas_stack(stack)
    if mas_stack is None:
        console.print(f"[red]Error:[/red] Invalid --stack value '{stack}'.")
        console.print(f"[yellow]Valid stack IDs:[/yellow] {format_valid_stack_ids()}")
        console.print(f"[yellow]Example:[/yellow] {example_stack_init_command()}")
        raise typer.Exit(1)
    return mas_stack


def install_mas_stack_presets(project_path: Path, mas_stack: MasStack) -> None:
    """Install bundled MAS core and stack presets for stack-aware init."""
    from .presets import PresetManager

    manager = PresetManager(project_path)
    speckit_ver = get_speckit_version()

    for preset_id, priority in mas_stack.preset_install_plan:
        bundled_path = _locate_bundled_preset(preset_id)
        if bundled_path is None:
            raise RuntimeError(f"Bundled MAS preset '{preset_id}' was not found")
        if manager.registry.is_installed(preset_id):
            continue
        manager.install_from_directory(bundled_path, speckit_ver, priority=priority)


def apply_mas_project_layer(
    project_path: Path,
    mas_stack: MasStack,
    *,
    init_opts: dict[str, Any],
    resolved_integration: Any,
    selected_ai: str,
    ai_skills: bool,
    skip_external_skills: bool,
    strict_external_skills: bool,
    external_skills_timeout: int,
    tracker: StepTracker,
    save_init_options: Any,
) -> list:
    """Install MAS presets and stack skills after shared infrastructure exists."""
    tracker.start("mas-presets")
    install_mas_stack_presets(project_path, mas_stack)
    tracker.complete("mas-presets", " + ".join(mas_stack.preset_composition))

    tracker.start("stack-skills")

    def _persist_external_skills_progress(results: list) -> None:
        payload = external_skills_to_init_payload(results)
        init_opts["external_skills"] = payload
        save_init_options(project_path, init_opts)
        write_external_skills_status(project_path, payload)
        installing = next((item for item in results if item.status == "installing"), None)
        if installing is not None:
            tracker.start("stack-skills", installing.reason)

    if not skip_external_skills:
        pending_specs = resolve_stack_external_skills(mas_stack)
        if pending_specs:
            pending_payload = pending_external_skills_payload(pending_specs)
            init_opts["external_skills"] = pending_payload
            save_init_options(project_path, init_opts)
            write_external_skills_status(project_path, pending_payload)

    try:
        external_skill_results = install_stack_external_skills(
            project_path,
            mas_stack,
            resolved_integration,
            selected_ai=selected_ai,
            ai_skills=ai_skills,
            skip=skip_external_skills,
            strict=strict_external_skills,
            timeout=external_skills_timeout,
            progress_callback=_persist_external_skills_progress,
        )
    except RuntimeError as ext_err:
        tracker.error("stack-skills", str(ext_err).replace("\n", " ")[:120])
        raise typer.Exit(1) from ext_err

    init_opts["external_skills"] = external_skills_to_init_payload(external_skill_results)
    save_init_options(project_path, init_opts)

    installed_count = sum(1 for item in external_skill_results if item.status == "installed")
    failed = [item for item in external_skill_results if item.status == "failed"]
    skipped = [item for item in external_skill_results if item.status == "skipped"]
    if skip_external_skills:
        tracker.skip("stack-skills", "--skip-external-skills")
    elif not external_skill_results:
        tracker.complete("stack-skills", "none configured")
    elif failed and not installed_count:
        tracker.error("stack-skills", f"{len(failed)} failed — see report below")
    else:
        summary_parts = []
        if installed_count:
            summary_parts.append(f"{installed_count} installed")
        if failed:
            summary_parts.append(f"{len(failed)} failed")
        if skipped:
            summary_parts.append(f"{len(skipped)} skipped")
        tracker.complete("stack-skills", ", ".join(summary_parts) or "ok")

    return external_skill_results


def finalize_mas_memory(project_path: Path, mas_stack: MasStack) -> None:
    """Write stack memory after the constitution template has been seeded."""
    write_stack_memory_files(project_path, mas_stack)


def print_external_skills_report(results: list) -> None:
    """Print the external-skills summary once init has finished."""
    from rich.panel import Panel

    if results:
        summary_report = render_external_skills_summary_panel(results)
        failed_count = sum(1 for item in results if item.status == "failed")
        panel_style = "red" if failed_count else "green"
        panel_title = (
            "[bold red]External Skills — Installation Failed[/bold red]"
            if failed_count
            else "[bold green]External Skills[/bold green]"
        )
        console.print()
        console.print(
            Panel(
                summary_report,
                title=panel_title,
                border_style=panel_style,
                padding=(1, 2),
            )
        )

    failure_report = render_external_skills_failure_panel(results)
    if failure_report:
        console.print()
        console.print(
            Panel(
                failure_report,
                title="[bold red]External Skills — Error Details[/bold red]",
                border_style="red",
                padding=(1, 2),
            )
        )
        console.print(
            "[dim]Progress and logs: .specify/init-options.json, "
            ".specify/external-skills-status.json, .specify/logs/. "
            "For private GitHub repos, export GH_TOKEN/GITHUB_TOKEN or run "
            "'gh auth login' (token is read automatically). Use "
            "--strict-external-skills to fail fast.[/dim]"
        )
