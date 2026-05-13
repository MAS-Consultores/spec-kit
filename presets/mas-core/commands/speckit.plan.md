---
description: Execute MAS stack-aware implementation planning.
strategy: wrap
---

## MAS Stack-Aware Planning Requirements

Before executing the core planning workflow, read these required project memory
files:

- `.specify/memory/constitution.md`
- `.specify/memory/stack.md`
- `.specify/memory/security-guidelines.md`
- `.specify/memory/stack-context.md`

If `stack.md`, `security-guidelines.md`, or `stack-context.md` is missing,
return `HARD_FAIL` and stop planning. Do not infer a stack, ask the user to pick
a stack, or continue with a generic plan. Tell the user to repair MAS
stack-aware initialization.

The stack in `.specify/memory/stack.md` is fixed project context selected during
`specify init --stack`. Planning must validate against that stack instead of
choosing a new one.

When filling the implementation plan:

- Ground Technical Context in the selected stack memory.
- Fill the `MAS Stack Validation` section in the plan artifact.
- Use validation severities exactly as: `PASS`, `WARNING`,
  `DEVIATION_REQUIRED`, `HARD_FAIL`.
- Validate stack alignment, stack constraints, security guideline alignment,
  expected artifact coverage, and compatibility / anti-pattern checks.
- Document deviations explicitly with reason, mitigation, and approval status.
- Treat the constitution as the highest-level governance source.

{CORE_TEMPLATE}
