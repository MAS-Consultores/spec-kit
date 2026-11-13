---
description: Execute MAS stack-aware implementation planning.
strategy: wrap
---

## MAS Feature Branch Check

Before planning, run the branch gate and stop when it exits 1. Do not plan on
`main` or `master`, and do not create a branch here.

- Bash: `.specify/scripts/bash/ensure-feature-branch.sh`
- PowerShell: `.specify/scripts/powershell/ensure-feature-branch.ps1`

The script exits 1 when HEAD is `main`, `master`, detached, or not a
`NNN-short-name` feature branch, and when `.specify/feature.json` names a
directory whose basename is not HEAD. That exit is `HARD_FAIL`.

## MAS Stack-Aware Planning Requirements

Before executing the core planning workflow, read these required project memory
files:

- `.specify/memory/constitution.md`
- `.specify/memory/stack.md`
- `.specify/memory/security-guidelines.md`
- `.specify/memory/stack-context.md`
- `.specify/memory/language-policy.md`

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
- Map failure modes from the feature spec and Constitution section VI into the
  plan's `Failure Modes & Error Handling` section.
- Complete `Native Capability Reuse Review` before proposing custom persistence,
  services, or duplicated stack functionality; use stack memory for stack-specific
  native capability expectations.

## MAS Language Policy Requirements

Read `.specify/memory/language-policy.md` and honor `artifact_language` /
`product_locale` from `.specify/init-options.json` when present.

- **Conversation**: Match the user's language for questions and summaries.
- **Persisted artifacts**: Write `plan.md` and related design artifacts in English only.
- **User-facing copy**: Fill the plan's `Language Strings & User-Facing Copy` section;
  cross-reference the spec's `## User-Facing Copy`. Quote product-locale strings
  literally — do not translate them into English inside English requirement text.
- **Moodle stacks**: List new/changed strings with keys and `lang/en` + product-locale files.

{CORE_TEMPLATE}
