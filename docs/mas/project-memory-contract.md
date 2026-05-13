# Project Memory Contract

Project memory is the persistent bridge between stack-aware initialization and
later Spec Kit workflow commands. It must be human-readable for agents and
stable enough for command prompts to depend on.

Upstream Spec Kit already initializes:

- `.specify/memory/constitution.md`

The MAS fork must add:

- `.specify/memory/stack.md`
- `.specify/memory/security-guidelines.md`
- `.specify/memory/stack-context.md`

## Required Files

### `.specify/memory/constitution.md`

Scope: global company governance.

Source: initialized from the MAS `mas-core` constitution template.

Purpose:

- defines company-wide non-negotiable principles;
- remains independent of any single implementation stack;
- drives the Constitution Check in `plan.md`;
- governs downstream specs, plans, tasks, reviews, and delivery decisions.

Content should include:

- security and access control;
- traceability and auditability;
- explicit data models and integrity;
- operational performance and reliability;
- administrative usability;
- stack-constrained design;
- maintainability and standardization;
- controlled delivery and rollback readiness.

Example skeleton:

```markdown
# MAS Project Constitution

## Core Principles

### I. Security and Access Control
[Company-wide rule text.]

### II. Traceability and Auditability
[Company-wide rule text.]

### III. Explicit Data Models and Integrity
[Company-wide rule text.]

### IV. Operational Performance and Reliability
[Company-wide rule text.]

### V. Administrative Usability
[Company-wide rule text.]

### VI. Stack-Constrained Design
[Company-wide rule text.]

### VII. Maintainability and Standardization
[Company-wide rule text.]

### VIII. Controlled Delivery and Rollback Readiness
[Company-wide rule text.]

## Governance
[Amendment, review, and compliance rules.]
```

### `.specify/memory/stack.md`

Scope: selected stack identity and fixed stack contract.

Source: written by `specify init --stack <stack-id>` from the catalog entry.

Purpose:

- records the canonical selected stack;
- prevents `speckit-plan` from selecting a different stack later;
- gives agents a short, stable summary of allowed technologies and boundaries;
- provides a human-readable audit trail of the initialization decision.

Example skeleton:

```markdown
# Selected MAS Stack

**Canonical ID**: `cakephp2-mysql`
**Display Name**: CakePHP 2.x + MySQL
**Selected During**: `specify init --stack cakephp2-mysql`

## Summary

[Short stack summary from the catalog.]

## Fixed Stack Boundaries

- [Required framework/runtime/database boundary.]
- [Allowed integration pattern.]
- [Explicitly disallowed migration or alternative stack.]

## Use This Stack For

- [Primary project type.]

## Do Not Use This Stack For

- [Project types requiring another approved stack.]

## Plan Validation

`speckit-plan` MUST validate proposed implementation plans against this stack.
It MUST NOT ask the user to choose a replacement stack during planning.
```

### `.specify/memory/security-guidelines.md`

Scope: stack-specific security guidance for the selected stack.

Source: copied or rendered from the selected stack preset.

Purpose:

- keeps stack-specific security guidance out of the shared constitution;
- gives `speckit-plan` concrete stack security rules to validate;
- gives downstream specs and tasks a stable security reference;
- supports project review and audit without requiring preset inspection.

Example skeleton:

```markdown
# Stack Security Guidelines

**Stack ID**: `moodle5-plugin`
**Display Name**: Moodle 5 -- Plugin

## Security Profile

[Short risk profile.]

## Required Checks

- [Capability, role, auth, validation, or data handling check.]
- [Stack-specific privacy or audit check.]

## Sensitive Data Surfaces

- [Academic data category.]
- [Personal data category.]
- [Export/report surface.]

## Prohibited Or High-Risk Patterns

- [Pattern that must fail validation or require explicit deviation.]

## Plan Validation Use

Plans must cite how each required check is satisfied or explain a deviation.
```

### `.specify/memory/stack-context.md`

Scope: required expanded stack context that is useful but too large for
`stack.md`.

Source: copied or rendered from the selected stack preset.

Purpose:

- stores detailed constraints, anti-patterns, expected artifacts, and likely
  project/module shapes;
- allows `stack.md` to stay concise;
- gives `speckit-plan`, `speckit-tasks`, and reviewers a richer reference;
- provides a stable memory surface that downstream commands can always read,
  even when the initial content is compact.

Example skeleton:

```markdown
# Stack Context: Laravel + Inertia + React

## Core Constraints

- [Constraint.]

## Anti-Patterns

- [Anti-pattern.]

## Expected Artifacts

- [Artifact.]

## Plan Validation Checks

- [Validation check.]

## Likely Project Shape

- [Routes/controllers/requests/policies/pages/tests structure notes.]
```

## Consumption Rules

Workflow commands should consume memory as follows:

| Workflow Stage | Required Memory Reads |
| --- | --- |
| `speckit-constitution` | `.specify/memory/constitution.md` |
| `speckit-specify` | `.specify/memory/constitution.md`, optionally `stack.md` for constraints |
| `speckit-plan` | `constitution.md`, `stack.md`, `security-guidelines.md`, `stack-context.md` |
| `speckit-tasks` | `constitution.md`, `stack.md`, `security-guidelines.md`, `stack-context.md`, generated `plan.md` |
| `speckit-implement` | `constitution.md`, current `plan.md`, `tasks.md`, and security guidance when tasks touch protected surfaces |

`speckit-plan` is the strictest consumer. If `stack.md`,
`security-guidelines.md`, or `stack-context.md` is missing in a MAS stack-aware
project, planning should fail with remediation instructions instead of
continuing with inferred stack behavior.

## Machine-Readable State

`.specify/init-options.json` currently stores init-time options for downstream
operations. MAS Phase 2 should extend it with stack metadata for tooling, but
Markdown memory remains the canonical agent-readable context.
