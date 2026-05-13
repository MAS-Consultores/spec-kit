# Repository Grounding

This note records the upstream Spec Kit surfaces inspected during Phase 1. It is
not a second architecture; it is an implementation map for Phase 2.

## Initialization

Primary file:

- `src/specify_cli/__init__.py`

Relevant behavior:

- `init()` defines the current CLI options, including `--integration`,
  `--script`, `--preset`, `--branch-numbering`, `--here`, and `--force`.
- It validates integration choice, target directory behavior, script type, and
  branch numbering before installing project files.
- It installs the selected integration through the integration registry.
- It installs shared infrastructure by calling the shared infra helpers.
- It initializes `.specify/memory/constitution.md` from
  `.specify/templates/constitution-template.md`.
- It writes `.specify/init-options.json` through `save_init_options()`.
- It optionally installs one preset through the existing `--preset` path.
- It installs the bundled `git` extension by default unless git setup is
  skipped.
- It installs the bundled `speckit` workflow when available.

Phase 2 implication:

`--stack` should be required for normal MAS init and validated after normal
option parsing but before any stack-aware files or presets are written. Invalid
or missing stack values must fail before partial stack setup. `--preset` must be
rejected when `--stack` is present.

## Shared Infrastructure

Primary file:

- `src/specify_cli/shared_infra.py`

Relevant behavior:

- `install_shared_infra()` copies shared scripts and templates into
  `.specify/scripts/` and `.specify/templates/`.
- It preserves existing files unless refresh or force behavior allows updates.
- It tracks managed shared files in the Spec Kit manifest.
- It processes command references in page templates using the selected
  integration's command separator.

Phase 2 implication:

MAS memory files should not be treated as ordinary shared templates unless the
implementation deliberately extends shared infra. A small dedicated stack-memory
writer in init is likely clearer, but it must run after MAS presets are
available so memory content comes from `mas-core` and the selected stack preset.

## Templates And Commands

Primary directories:

- `templates/`
- `templates/commands/`

Relevant files:

- `templates/constitution-template.md`
- `templates/plan-template.md`
- `templates/spec-template.md`
- `templates/tasks-template.md`
- `templates/commands/plan.md`
- `templates/commands/constitution.md`

Relevant behavior:

- Shared templates are copied into `.specify/templates/` during init.
- Command templates are processed by integrations into agent-specific command
  files or skills.
- The current plan command loads the feature spec and
  `.specify/memory/constitution.md`, then fills `plan-template.md`.
- The current plan template contains Technical Context and Constitution Check
  sections but no stack-memory contract.

Phase 2 implication:

MAS should update these through `mas-core` and stack presets where possible.
Direct core template edits should be reserved for behavior that must apply even
without MAS stack-aware init. Constitution initialization is the exception that
needs careful ordering: `mas-core` must be installed or otherwise resolvable
before `.specify/memory/constitution.md` is created.

## Presets

Primary files and directories:

- `src/specify_cli/presets.py`
- `presets/`
- `presets/ARCHITECTURE.md`
- `presets/README.md`
- `presets/catalog.json`

Relevant behavior:

- A preset is a directory with `preset.yml`.
- Installed presets are copied to `.specify/presets/<preset-id>/`.
- `PresetManager.install_from_directory()` installs local or bundled presets.
- `PresetResolver` resolves templates by priority.
- Preset command entries are registered into detected agent directories at
  install time.
- Template and command entries can use `replace`, `prepend`, `append`, or
  `wrap`.
- Lower numeric priority has higher precedence.

Phase 2 implication:

`mas-core` and stack presets should be normal bundled presets. Stack-aware init
should call existing preset installation logic rather than copying preset files
manually.

## Integration State

Primary files:

- `src/specify_cli/integration_state.py`
- `src/specify_cli/integrations/base.py`
- `src/specify_cli/integrations/manifest.py`

Relevant behavior:

- `.specify/integration.json` records installed and default integrations.
- `.specify/init-options.json` records init-time options used later by
  extension and preset flows.
- Integrations process command templates into agent-specific locations and
  formats.

Phase 2 implication:

Stack metadata should be added to `.specify/init-options.json` for tools, but
agent-readable stack context must live in `.specify/memory/*.md`.

## Workflows

Primary directory:

- `workflows/speckit/workflow.yml`

Relevant behavior:

- The bundled workflow runs specify, plan, tasks, and implement with review
  gates.
- It currently passes the original spec input to `speckit.plan`.

Phase 2 implication:

The workflow does not need to pass stack arguments if stack memory is written at
init. `speckit-plan` should load the selected stack from memory.
