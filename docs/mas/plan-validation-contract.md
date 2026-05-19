# Plan Validation Contract

This document defines the future MAS behavior for `speckit-plan`.

In the MAS fork, the stack is selected during initialization. The plan stage
validates against that selected stack. It does not ask the user to choose a
technology stack from scratch.

## Current Upstream Behavior

The upstream `templates/commands/plan.md` command currently instructs the agent
to:

- run the setup script;
- load the feature specification;
- load `.specify/memory/constitution.md`;
- fill the implementation plan template;
- evaluate constitution gates;
- produce `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`.

The upstream `templates/plan-template.md` includes a Technical Context section
where language, dependencies, storage, testing, platform, project type,
performance goals, and constraints are filled during planning.

MAS keeps this flow but changes the role of Technical Context. It must document
the selected stack and validate alignment, not choose a new stack.

## Required Memory Reads

Before producing or finalizing a plan, `speckit-plan` must read:

- `.specify/memory/constitution.md`
- `.specify/memory/stack.md`
- `.specify/memory/security-guidelines.md`
- `.specify/memory/stack-context.md`

If `stack.md`, `security-guidelines.md`, or `stack-context.md` is missing,
`speckit-plan` must fail for a MAS initialized project and tell the user to
rerun or repair stack-aware initialization.

## Validation Categories

`speckit-plan` must validate the plan across these categories.

### Stack Alignment

- The plan names the selected stack ID and display name.
- The proposed implementation uses the selected stack as the controlling
  architecture.
- The plan does not introduce a replacement framework, runtime, database, or
  product architecture without an explicit deviation.

### Stack Constraints

- The plan satisfies the stack's core constraints.
- Required stack conventions are reflected in the project structure.
- Database, integration, routing, plugin, or frontend boundaries match the
  selected stack.

### Security Guideline Alignment

- Stack-specific security guidelines are cited or mapped to concrete design
  choices.
- Role, authorization, privacy, validation, session, export, and audit surfaces
  are addressed where relevant.
- High-risk patterns are either absent or explicitly documented as deviations.

### Expected Artifact Coverage

- The plan includes artifacts required by the selected stack.
- Missing artifacts are justified as not applicable.
- Generated Phase 1 outputs are aligned with the stack, such as capability
  matrices for Moodle plugins or route/policy/page maps for Laravel/Inertia.

### Compatibility And Anti-Pattern Checks

- The plan avoids stack-specific anti-patterns.
- The plan names compatibility requirements, migration constraints, and rollback
  considerations.
- Reporting/export-heavy work includes performance and access-control checks.

## Pass Criteria

A plan passes stack validation when:

- the selected stack is loaded from project memory;
- all validation categories are satisfied;
- every required stack artifact is present or marked not applicable with a
  reason;
- every constitution gate passes;
- every security guideline is satisfied or has an explicit approved deviation.

## Validation Severity

Validation results must distinguish severity. Not every non-pass result is the
same kind of failure.

| Severity | Meaning | Plan Behavior |
| --- | --- | --- |
| `PASS` | The plan satisfies the rule. | Continue. |
| `WARNING` | The plan is incomplete, weakly evidenced, or needs remediation, but does not violate a stack boundary or security rule. | Continue only if the remediation is recorded in the plan or tasks. |
| `DEVIATION_REQUIRED` | The plan proposes a high-risk or non-standard approach that may be acceptable only with explicit deviation documentation and approval. | Block final plan approval until the deviation is documented and approved. |
| `HARD_FAIL` | The plan is missing required stack memory, replaces the selected stack, violates the constitution, or omits a non-negotiable security/control requirement. | Stop planning until corrected. |

## Hard Fail Criteria

A plan hard-fails stack validation when:

- no stack memory is available;
- the plan relies on an unapproved stack or replaces the selected stack;
- required stack-specific security controls are missing;
- required artifacts are omitted without justification;
- a prohibited anti-pattern appears without an explicit deviation;
- constitution violations are unresolved or unjustified.

Validation outcomes should be visible in the plan artifact, not only in chat
output. The plan should include a validation section that marks each check with
its severity and required remediation.

## Deviations

Some projects may need controlled deviations. Deviations must be explicit and
auditable. Each deviation should include:

- the stack rule being deviated from;
- why the deviation is required;
- simpler or compliant alternatives considered;
- additional controls or mitigations;
- rollback or containment plan;
- approval status or required approver.

Unapproved deviations should block final plan approval. Approved deviations may
allow planning to proceed, but the plan must carry the mitigation and any
follow-up tasks.

## Interaction With The Company Constitution

The constitution remains the highest-level governance source. Stack validation
does not replace the Constitution Check. Instead:

- the constitution defines company-wide principles;
- `stack.md` defines the selected stack boundary;
- `security-guidelines.md` defines stack-specific security checks;
- `stack-context.md` defines detailed anti-patterns and expected artifacts.

If a stack guideline conflicts with the constitution, the constitution wins and
the stack preset must be corrected.

## Recommended Plan Section

Future MAS plan templates should include a section like:

```markdown
## MAS Stack Validation

**Selected Stack**: `[stack-id]` - `[display name]`

### Stack Alignment

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Check result.]

### Stack Constraints

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Check result.]

### Security Guideline Alignment

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Check result.]

### Expected Artifact Coverage

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Check result.]

### Compatibility And Anti-Patterns

- [PASS/WARNING/DEVIATION_REQUIRED/HARD_FAIL] [Check result.]

### Deviations

| Rule | Reason | Mitigation | Approval |
| --- | --- | --- | --- |
| [Rule] | [Reason] | [Mitigation] | [Status] |
```

## Stack-Specific Validation Summary

| Stack ID | Required Validation Emphasis |
| --- | --- |
| `cakephp2-mysql` | legacy compatibility, MySQL schema safety, CakePHP 2.x patterns, regression coverage, report/export query impact |
| `moodle3` | documented exception with approver and Moodle 5 sunset, patch/isolation controls, compensating controls evidence, migration plan with capability/data mapping, no new privileged features without sign-off |
| `moodle5-plugin` | plugin type, Moodle APIs, capabilities, roles, privacy provider, install/upgrade path |
| `moodle5-portal` | integration boundary, SSO/session identity, Moodle visibility mapping, sync/failure model, Moodle-origin data controls |
| `laravel-inertia-react` | Laravel route/controller/request/policy coverage, Inertia prop safety, React page contract, report/export bounds |
