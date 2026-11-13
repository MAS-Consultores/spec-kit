---
description: Generate MAS stack-aware implementation tasks.
strategy: wrap
---

## MAS Feature Branch Check

Before generating tasks, run the branch gate and stop when it exits 1. Do not
generate tasks on `main` or `master`, and do not create a branch here.

- Bash: `.specify/scripts/bash/ensure-feature-branch.sh`
- PowerShell: `.specify/scripts/powershell/ensure-feature-branch.ps1`

The script exits 1 when HEAD is `main`, `master`, detached, or not a
`NNN-short-name` feature branch, and when `.specify/feature.json` names a
directory whose basename is not HEAD. That exit is `HARD_FAIL`.

## MAS Stack-Aware Task Generation Requirements

Before executing core task generation, read and treat the following files as required MAS context:

- `.specify/memory/constitution.md`
- `.specify/memory/stack.md`
- `.specify/memory/security-guidelines.md`
- `.specify/memory/stack-context.md`
- `.specify/memory/language-policy.md`
- The generated `plan.md`, especially its `MAS Stack Validation` section

For MAS-initialized projects, the stack is fixed project context selected during `specify init --stack <stack-id>`. Do not choose, infer, or substitute a different stack during task generation.

If any required MAS memory file is missing, stop normal task generation and report `HARD_FAIL` with the missing file names. The project must repair initialization or restore the missing memory before implementation tasks are generated.

Use the MAS validation severity values from `plan.md` as follows:

- `PASS`: Do not create extra remediation tasks for that validation item unless the implementation plan already requires concrete work.
- `WARNING`: Add targeted verification, follow-up, or risk-reduction tasks where the warning affects implementation.
- `DEVIATION_REQUIRED`: Add explicit remediation, approval, mitigation, and documentation tasks before or inside the affected user story.
- `HARD_FAIL`: Do not generate normal implementation tasks. Generate only plan-repair tasks that explain what must be corrected before implementation can proceed.

When generating tasks, translate MAS context into practical work items where relevant:

- permissions, roles, visibility boundaries, and access-control checks
- stack-specific security guidelines and sensitive data handling
- audit, traceability, logging, and export/report review points
- expected stack artifacts from `.specify/memory/stack-context.md`
- compatibility constraints and anti-pattern mitigation
- admin/coordinator workflows, pagination, bulk operations, operational load, and rollback readiness

Preserve the Spec Kit task model: phases, user-story grouping, independent delivery, `[P]` parallelization cues, MVP-first sequencing, and exact file paths.

## MAS Language Policy Requirements

Read `.specify/memory/language-policy.md`. Write `tasks.md` in English. When tasks
touch user-visible text, reference the spec's `## User-Facing Copy` and the plan's
`Language Strings & User-Facing Copy` section; include tasks for Moodle `lang/` files
or equivalent when applicable.

{CORE_TEMPLATE}
