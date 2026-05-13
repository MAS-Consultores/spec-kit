# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `__SPECKIT_COMMAND_PLAN__` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with technical details
  grounded in the MAS stack selected during initialization. Do not select a new
  stack here; read `.specify/memory/stack.md` and validate against it.
-->

**Selected Stack**: [Canonical ID and display name from `.specify/memory/stack.md`]

**Language/Version**: [From selected stack and project context, or NEEDS CLARIFICATION]

**Primary Dependencies**: [From selected stack and project context, or NEEDS CLARIFICATION]

**Storage**: [From selected stack and project context, or N/A]

**Testing**: [Stack-appropriate testing approach or NEEDS CLARIFICATION]

**Target Platform**: [Stack target platform or NEEDS CLARIFICATION]

**Project Type**: [Stack project type or NEEDS CLARIFICATION]

**Performance Goals**: [Domain-specific goals, especially reports/exports/admin flows, or NEEDS CLARIFICATION]

**Constraints**: [Constraints from `.specify/memory/stack.md` and `.specify/memory/stack-context.md`]

**Scale/Scope**: [Domain-specific scope or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on `.specify/memory/constitution.md`]

## MAS Stack Validation

*GATE: Must validate against the stack selected during `specify init --stack`. Use severities: `PASS`, `WARNING`, `DEVIATION_REQUIRED`, `HARD_FAIL`.*

**Selected Stack**: [Canonical ID and display name from `.specify/memory/stack.md`]

### Stack Alignment

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Does the plan stay within the selected stack?]

### Stack Constraints

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Does the plan satisfy fixed boundaries and core constraints from stack memory?]

### Security Guideline Alignment

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Does the plan address required checks from `security-guidelines.md`?]

### Expected Artifact Coverage

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Does the plan include stack-required artifacts or justify not applicable items?]

### Compatibility And Anti-Patterns

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Does the plan avoid prohibited or high-risk patterns from `stack-context.md`?]

### Deviations

| Rule | Severity | Reason | Mitigation | Approval |
| --- | --- | --- | --- | --- |
| [Rule or N/A] | [DEVIATION_REQUIRED/HARD_FAIL or N/A] | [Reason] | [Mitigation] | [Status/approver] |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
|-- plan.md              # This file (__SPECKIT_COMMAND_PLAN__ command output)
|-- research.md          # Phase 0 output (__SPECKIT_COMMAND_PLAN__ command)
|-- data-model.md        # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
|-- quickstart.md        # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
|-- contracts/           # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
`-- tasks.md             # Phase 2 output (__SPECKIT_COMMAND_TASKS__ command - NOT created by __SPECKIT_COMMAND_PLAN__)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Use the selected stack's likely project shape from
  `.specify/memory/stack-context.md`. Delete unused options and expand the
  chosen structure with real paths.
-->

```text
[Replace with stack-appropriate project/module structure]
```

**Structure Decision**: [Document the selected structure and reference the real directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check or MAS Stack Validation has violations that must be justified**

| Violation | Severity | Why Needed | Simpler / Compliant Alternative Rejected Because |
| --- | --- | --- | --- |
| [e.g., direct Moodle DB access] | [DEVIATION_REQUIRED] | [current need] | [why compliant integration is insufficient] |
