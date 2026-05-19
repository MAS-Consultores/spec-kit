# Stack-Aware Initialization Contract

This document defines the future MAS behavior for:

```bash
specify init . --stack <stack-id>
```

The contract applies equally to `specify init <project-name> --stack <stack-id>`
unless a later implementation explicitly limits stack-aware initialization to
existing directories.

In the MAS fork, `--stack` is required for normal project initialization.
Stack-less initialization is not a supported path for MAS delivery projects. If
maintainers keep a stack-less path for upstream compatibility, testing, or preset
development, it must be explicitly framed as maintainer/dev-only and must not
write MAS stack memory.

## Concept

`--stack` is a first-class selector of bundled MAS company presets. It is not a
free-form technology description and it is not a replacement for the existing
Spec Kit integration selector.

Selecting a stack must:

- validate the stack ID against the MAS stack catalog;
- install the shared company preset `mas-core`;
- install exactly one stack-specific preset;
- write project memory files that persist the selected stack and its security
  context;
- keep later workflow commands aligned with the selected stack.

## Difference From Upstream Behavior

Current upstream behavior supports `specify init --preset <preset-id>`, which
installs at most one explicitly named preset after shared infrastructure,
integration state, and the constitution file are initialized.

MAS stack-aware initialization changes the meaning of this entry point:

- upstream: presets are user-selected optional customizations;
- MAS fork: `--stack` is the approved company stack selector and installs a
  prescribed preset composition;
- upstream: planning may ask for or infer a technology stack;
- MAS fork: planning validates against the stack selected during init.

The existing `--integration`, `--script`, `--here`, `--force`,
`--branch-numbering`, and agent-specific options should remain user-configurable
unless they conflict with a documented MAS policy.

`--preset` is mutually exclusive with `--stack` in the initial MAS
implementation. Additive preset composition may be designed later, but Phase 2
must reject commands that provide both options.

## Missing Stack Flow

If a normal MAS project initialization omits `--stack`, init must fail before
writing project files or installing presets. The error should explain that MAS
projects require an approved stack and list the valid stack IDs.

Any retained stack-less mode must be opt-in, maintainer/dev-only, and outside the
normal MAS project contract.

## Accepted Values

Only the following stack IDs are valid:

- `cakephp2-mysql`
- `moodle3`
- `moodle5-plugin`
- `moodle5-portal`
- `laravel-inertia-react`

Validation must be exact, case-sensitive, and based on the canonical catalog in
[Stack Catalog](stack-catalog.md). If a user supplies an invalid value, init must
fail before writing project files or installing presets.

The error should include:

- the invalid value;
- the list of valid stack IDs;
- an example command.

## Preset Mapping

The implementation must map each stack ID to this preset composition:

| Stack ID | Installed Presets |
| --- | --- |
| `cakephp2-mysql` | `mas-core` + `mas-stack-cakephp2-mysql` |
| `moodle3` | `mas-core` + `mas-stack-moodle3` |
| `moodle5-plugin` | `mas-core` + `mas-stack-moodle5-plugin` |
| `moodle5-portal` | `mas-core` + `mas-stack-moodle5-portal` |
| `laravel-inertia-react` | `mas-core` + `mas-stack-laravel-inertia-react` |

The exact preset IDs above are the Phase 2 implementation contract. They are
explicit, namespaced, and do not conflict with the shorter stack IDs used by
`--stack`.

## Valid Stack Flow

When `--stack` is valid, init should execute this conceptual flow:

1. Parse and validate the normal init options.
2. Validate `--stack` against the MAS stack catalog.
3. Reject `--preset` if it was also supplied.
4. Resolve the selected integration and script type using existing Spec Kit
   behavior.
5. Install the selected integration.
6. Install shared Spec Kit infrastructure into `.specify/scripts/` and
   `.specify/templates/`.
7. Install bundled preset `mas-core`.
8. Install the stack-specific bundled preset for the selected stack.
9. Initialize `.specify/memory/constitution.md` from the MAS source of truth.
   The implementation must install the selected MAS presets early enough that
   constitution initialization uses the `mas-core` constitution content, not the
   upstream generic default followed by ad hoc replacement.
10. Persist normal init options in `.specify/init-options.json`, extended with
   stack metadata.
11. Write MAS project memory files:
    - `.specify/memory/stack.md`
    - `.specify/memory/security-guidelines.md`
    - `.specify/memory/stack-context.md`
12. Install the bundled `speckit` workflow and any default extensions using
    existing behavior.
13. Print next steps that show the selected stack and remind the user that
    `speckit-plan` will validate against it.

## Invalid Stack Flow

If `--stack` is invalid:

- no presets should be installed;
- no MAS memory files should be written;
- the command should exit non-zero;
- any failure must happen before partial stack-aware setup occurs.

If normal upstream initialization has already created files before the invalid
stack is detected, the implementation is incorrectly ordered.

## Artifacts Written During Init

Future stack-aware init must produce the normal upstream artifacts plus these MAS
artifacts:

| Artifact | Purpose |
| --- | --- |
| `.specify/presets/mas-core/` | Shared MAS governance, templates, and command adjustments |
| `.specify/presets/mas-stack-<stack-id>/` | Selected stack-specific preset |
| `.specify/memory/stack.md` | Human-readable selected stack contract |
| `.specify/memory/security-guidelines.md` | Stack-specific security guidance copied from the selected preset |
| `.specify/memory/stack-context.md` | Expanded constraints, anti-patterns, expected artifacts, and validation notes |
| `.specify/init-options.json` | Existing init state extended with `stack` metadata |

The stack metadata in `.specify/init-options.json` should be machine-readable.
A recommended shape is:

```json
{
  "stack": "cakephp2-mysql",
  "stack_display_name": "CakePHP 2.x + MySQL",
  "mas_presets": ["mas-core", "mas-stack-cakephp2-mysql"]
}
```

The Markdown files remain the primary agent-readable memory surface.

## User-Configurable At Init

Users may configure:

- target directory or `--here`;
- integration through `--integration`;
- integration-specific options;
- shell script type through `--script`;
- branch numbering;
- normal `--force` behavior for merging into existing directories.

Users must not configure:

- arbitrary stack IDs;
- stack-less initialization for normal MAS delivery projects;
- `--preset` together with `--stack`;
- more than one stack preset through `--stack`;
- stack-specific security files independently of the selected stack;
- a stack preset that does not match the selected stack.

The first MAS implementation must reject `--preset` together with `--stack`.
Users who need additional preset composition require a later, explicit design.
