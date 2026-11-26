# MAS Stack: Moodle 5 Plugin

Bounded Moodle 5 plugin extension work. Canonical stack rules live in
`src/specify_cli/mas.py` (`moodle5-plugin`) and are materialized into
`.specify/memory/stack-context.md` during `specify init --stack moodle5-plugin`.
This file mirrors that catalog for maintainers.

## Native Capability Reuse (Moodle)

**MUST**

- Reuse Moodle core APIs, database tables, capabilities, events, logging mechanisms,
  enrolment models, course and user APIs, access tracking, completion tracking, and
  reporting facilities before introducing custom tables or duplicated logic.
- Before creating a custom Moodle database table, document in the plan's
  `Native Capability Reuse Review` which Moodle core tables and APIs were evaluated.
- If Moodle already stores or exposes the required information, consume the existing
  Moodle source of truth instead of duplicating data.

**SHOULD**

- Prefer official Moodle documentation and supported extension points over custom
  persistence, services, or parallel abstractions.

**MUST NOT**

- Duplicate core Moodle data such as users, courses, roles, enrolments, capabilities,
  logs, grades, access records, last access or activity records, or activity
  completion unless a documented architectural reason exists in the plan.

Custom Moodle plugin tables MUST be limited to plugin-owned domain data not already
represented by Moodle core or an existing supported plugin API.

## Conventional Commits

`specify init` does not change `.git`. Activate the shared commit-msg hook once:

```bash
mkdir -p .githooks
cp .specify/templates/githooks/commit-msg .githooks/commit-msg
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks
```

Copy `.specify/templates/ci/conventional-commits.yml` to
`.github/workflows/conventional-commits.yml`. The workflow has
`permissions: contents: read` and checks the pull request title and every
commit from the merge base to HEAD with `.specify/scripts/bash/check-commit-msg.sh`.

## Higiene y código limpio

Incluye la base mas-core. `moodle-plugin-ci` aplica al plugin. PHPMD y jscpd bloquean hallazgos nuevos contra `.specify/clean-baseline.txt`. `thirdpartylibs.xml` es obligatorio si hay vendor. Cada página nueva lleva `require_login()`, `require_capability()` y `sesskey` en acciones.
