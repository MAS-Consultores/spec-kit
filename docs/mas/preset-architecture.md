# MAS Preset Architecture

MAS stack-aware behavior must use Spec Kit's existing preset model. A MAS
initialized project is composed from:

```text
mas-core + exactly one mas-stack-<stack-id>
```

This keeps company customization visible in the same places upstream already
uses for customization: preset manifests, preset templates, preset commands,
and project memory files.

## Current Upstream Model

The upstream preset system is implemented in `src/specify_cli/presets.py`.
Installed presets live under `.specify/presets/<preset-id>/` and are tracked by
a registry. Template resolution walks:

1. `.specify/templates/overrides/`
2. `.specify/presets/<preset-id>/`
3. `.specify/extensions/<ext-id>/templates/`
4. `.specify/templates/`
5. bundled/source fallback templates

Preset entries are declared in `preset.yml`. Each provided item can be a
template, command, or script. Composition strategies include `replace`,
`prepend`, `append`, and `wrap`.

MAS should rely on these mechanics rather than adding a second stack resolver.

## `mas-core`

`mas-core` is the shared company preset. It contains company-wide behavior that
applies to every approved stack.

`mas-core` should include:

- company constitution template content;
- shared governance rules for security, traceability, data integrity,
  operational reliability, administrative usability, error handling and failure
  management, maintainability, controlled delivery, and rollback readiness;
- shared command adjustments that tell agents to load MAS memory files;
- shared sections for specs, plans, and tasks that are independent of stack;
- common expected artifact language for learning-related business workflows;
- common plan validation structure that delegates stack-specific checks to the
  selected stack memory.

During stack-aware init, `mas-core` must be installed before
`.specify/memory/constitution.md` is initialized. The initialized constitution
must come from the MAS source of truth, not from the upstream generic
constitution template followed by one-off replacement.

`mas-core` must not include:

- CakePHP-specific implementation rules;
- Moodle plugin capability details;
- Moodle portal SSO or sync details;
- Laravel/Inertia/React route, policy, or prop conventions;
- stack-specific anti-pattern lists;
- stack-specific security profiles.

## Stack Presets

Each stack preset contains only the behavior that varies by stack:

- `mas-stack-cakephp2-mysql`
- `mas-stack-moodle3`
- `mas-stack-moodle5-plugin`
- `mas-stack-moodle5-portal`
- `mas-stack-laravel-inertia-react`

A stack preset should include:

- stack constraints;
- stack-specific security guidelines;
- anti-patterns;
- expected artifacts;
- plan validation checks;
- likely project/module shape;
- stack-specific examples where useful.

A stack preset must not redefine the company constitution except through a
documented composition strategy that adds stack-specific references. Company
governance remains owned by `mas-core`.

Each stack preset should eventually provide enough source content to generate
`.specify/memory/stack.md`, `.specify/memory/security-guidelines.md`, and
`.specify/memory/stack-context.md`.

## External Skills (`stack-skills.yml`)

MAS presets may declare optional **external agent skills** (skills.sh ecosystem)
in a sibling manifest `stack-skills.yml`. This file is separate from
`preset.yml` and does not use `provides.templates`.

| Preset | Typical external skills |
| --- | --- |
| `mas-core` | Shared across all stacks (for example `find-skills`) |
| `mas-stack-<stack-id>` | Stack-specific skills (for example `vercel-react-best-practices` on `laravel-inertia-react`) |

Schema:

```yaml
schema_version: "1.0"
skills:
  - source: vercel-labs/skills   # owner/repo or URL
    skill: find-skills           # skill name in that repository
```

During `specify init --stack`, the CLI merges `mas-core` and the selected stack
manifest, then runs `npx skills add <source> --skill <skill> -y --copy -a <agent>`
for each entry when the integration supports skills mode. Installed skills keep
their original directory names (no `speckit-` prefix). Results are recorded in
`.specify/init-options.json` under `external_skills`.

**Requirements**: Node.js with `npx` on PATH. The CLI resolves `npx` to its full
executable path (for example `C:\Program Files\nodejs\npx.cmd` on Windows) before
running `subprocess`, because invoking the bare `npx` name alone often fails with
`[WinError 2]` on Windows. Use `--skip-external-skills` when Node is unavailable
or you are offline.

Bundled preset directories must include `stack-skills.yml` when skills are
required so wheel installs and source checkouts resolve the same paths via
`_locate_bundled_preset()`.
### Stack memory materialization (current)

During `specify init --stack <stack-id>`, MAS writes the three stack memory
files under `.specify/memory/`.

**Canonical source today**: `MasStack` entries in `src/specify_cli/mas.py`
(`write_stack_memory_files`). After initialization, agents and `speckit-plan`
MUST treat those memory files as authoritative—not the preset scaffold Markdown.

The files under `presets/mas-stack-*/templates/` (for example Moodle native reuse
rules) are human-readable companions for maintainers. They MUST stay aligned
with `mas.py` when stack constraints change; update `mas.py` first, then mirror
the preset template.

## Composition Priority

The implementation must install `mas-core` and the selected stack preset with
deterministic priorities.

Initial MAS ordering:

| Preset | Priority | Purpose |
| --- | ---: | --- |
| selected `mas-stack-*` | 5 | highest MAS stack-specific layer |
| `mas-core` | 10 | shared MAS base layer |
| upstream core templates | n/a | fallback |

Lower numeric priority wins in upstream Spec Kit. Stack presets should therefore
have higher precedence than `mas-core`, while using `append`, `prepend`, or
`wrap` where the goal is augmentation rather than replacement.

## Responsibility Matrix

| Theme | `mas-core` | Stack Preset |
| --- | --- | --- |
| Company constitution | Owns baseline content | May reference stack memory only |
| Shared templates | Owns company-wide sections | Adds or composes stack-specific sections |
| Company-wide command adjustments | Owns | May add stack validation instructions |
| Security and access-control principles | Owns common principles | Owns implementation-specific guidelines |
| Traceability and auditability | Owns common requirements | Defines stack-specific audit surfaces |
| Explicit data models and integrity | Owns common expectations | Defines stack-specific schema/data patterns |
| Operational performance and reliability | Owns common expectations | Defines stack-specific performance risks |
| Administrative usability | Owns common UX expectations | Defines stack-specific workflow artifacts |
| Error handling and failure management | Owns common failure-mode and UX expectations | Defines stack-specific error surfaces and patterns |
| Stack constraints | References selected stack | Owns details |
| Native capability reuse | Owns general reuse-before-custom rule | Owns stack-specific native APIs, tables, and anti-duplication rules |
| Stack anti-patterns | Prohibits bypassing stack constraints | Owns concrete anti-pattern list |
| Stack-specific plan checks | Defines validation framework | Owns check content |
| Stack-specific examples/tasks | Avoids | Owns |
| Expected artifacts | Owns common artifact categories | Owns stack-specific artifact list |

## Files Likely Needed In Phase 2

Phase 2 will likely touch these existing areas:

- `src/specify_cli/__init__.py`: add `--stack`, validate values, orchestrate
  bundled preset installation, and write memory files.
- `src/specify_cli/presets.py`: reuse `PresetManager.install_from_directory`;
  avoid broad changes unless bundled preset lookup requires adjustment.
- `presets/`: add `mas-core` and one preset directory per approved stack.
- `presets/catalog.json`: optionally expose bundled MAS presets if they should
  be installable through `specify preset add`.
- `templates/commands/plan.md` or MAS preset command overrides: teach
  `speckit-plan` to load stack memory and validate against it.
- `templates/plan-template.md` or MAS preset template overrides: add MAS stack
  validation sections.
- `src/specify_cli/shared_infra.py`: only if new shared memory initialization
  requires common helper extraction.

## Non-Goals

MAS stack behavior should not be implemented as:

- a separate `.mas/` configuration system;
- a second template resolver;
- hidden command arguments passed only to `speckit-plan`;
- user-provided free-form stack descriptions;
- multiple simultaneous stack presets for one project.
