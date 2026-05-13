# MAS Spec Kit Customization Design

This directory defines the Phase 1 design package for the MAS internal fork of
GitHub Spec Kit. The fork will remain aligned with upstream Spec Kit while
adding company-governed, stack-aware initialization for MAS learning-platform
delivery work.

The objective is to turn `specify init` into the entry point for selecting an
approved company stack. A selected stack will preload company governance,
stack-specific rules, and security context so later workflow stages can validate
against the original decision instead of asking the user to choose a technology
stack during planning.

## Scope

Phase 1 defines the architecture only. It documents:

- the canonical approved stack catalog
- the future contract for mandatory `specify init . --stack <stack-id>` usage
- the preset split between shared MAS governance and stack-specific presets
- the project memory files that must persist the selected stack context
- the future `speckit-plan` validation behavior
- the model for stack-specific security guidelines

Phase 1 intentionally does not implement:

- CLI parsing for `--stack`
- preset scaffolding or bundled preset manifests
- command/template rewrites
- plan validation code
- migration tooling for existing projects

## Repository Grounding

The current upstream fork already provides the core mechanisms this design
builds on:

- `templates/` contains shared artifact templates such as
  `spec-template.md`, `plan-template.md`, `tasks-template.md`, and
  `constitution-template.md`.
- `templates/commands/` contains agent command templates, including
  `plan.md`, which currently instructs agents to load the feature spec and
  `.specify/memory/constitution.md`.
- `src/specify_cli/__init__.py` implements `specify init`. It installs the
  selected integration, installs shared scripts/templates through
  `shared_infra.py`, initializes `.specify/memory/constitution.md` from the
  constitution template, persists `.specify/init-options.json`, and optionally
  installs one preset through `--preset`.
- `src/specify_cli/presets.py` implements installable presets, preset
  registries, catalog lookup, command registration, and template resolution.
  Presets are priority ordered and support `replace`, `prepend`, `append`, and
  `wrap` composition strategies.
- `presets/ARCHITECTURE.md` documents the current preset resolution order:
  project overrides, installed presets, extensions, core project templates, and
  bundled/source fallbacks.

The main architectural decision is therefore to build MAS customization on top
of Spec Kit presets, templates, commands, and memory files. The fork must not
create a parallel stack configuration system.

## Design Documents

- [Stack Catalog](stack-catalog.md): canonical approved stack IDs and expected
  stack behavior.
- [Initialization Contract](initialization-contract.md): future behavior of
  `specify init . --stack <stack-id>`.
- [Preset Architecture](preset-architecture.md): `mas-core` plus exactly one
  stack preset composition model.
- [Project Memory Contract](project-memory-contract.md): required memory files
  written during initialization and consumed downstream.
- [Plan Validation Contract](plan-validation-contract.md): future behavior of
  `speckit-plan` as stack validator rather than stack selector.
- [Security Guidelines Model](security-guidelines-model.md): company-wide vs
  stack-specific security guidance.
- [Repository Grounding](repository-grounding.md): inspected upstream surfaces
  that Phase 2 will likely modify or rely on.

## Phase 2 Implementation Boundary

The first implementation phase should add the smallest CLI and preset changes
that realize this design:

1. define the stack catalog in code or bundled metadata;
2. require and validate `--stack` for normal MAS `specify init`;
3. reject `--stack` together with `--preset`;
4. install `mas-core` and the selected stack preset as bundled presets before
   initializing the project constitution;
5. write the required stack memory files;
6. update `speckit-plan` instructions to read and validate those memory files.

Any implementation that bypasses the existing preset system or stores stack
state only in command arguments would violate this design.
