---
description: Generate MAS stack-aware implementation tasks.
strategy: wrap
---

## MAS Stack-Aware Task Generation Requirements

Before executing core task generation, read and treat the following files as required MAS context:

- `.specify/memory/constitution.md`
- `.specify/memory/stack.md`
- `.specify/memory/security-guidelines.md`
- `.specify/memory/stack-context.md`
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

{CORE_TEMPLATE}
