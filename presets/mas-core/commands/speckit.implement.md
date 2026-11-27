---
description: Execute MAS implementation on the feature branch, then merge locally to main.
strategy: wrap
---

## MAS Feature Branch Check

Before implementing, run the branch gate and stop when it exits 1. Do not
implement on `main` or `master`, and do not create a branch here.

- Bash: `.specify/scripts/bash/ensure-feature-branch.sh`
- PowerShell: `.specify/scripts/powershell/ensure-feature-branch.ps1`

The script exits 1 when HEAD is `main`, `master`, detached, or not a
`NNN-short-name` feature branch, and when `.specify/feature.json` names a
directory whose basename is not HEAD. That exit is `HARD_FAIL`.

## MAS Local Merge To Main

After every task in `tasks.md` is done and the project's checks pass, finish on
`main` with a local merge. Do not create a tag. Do not push and do not open a
pull request unless the developer accepts the recommendation below. Do not run
`git branch`, `git checkout`, or `git merge` yourself.

Run the bundled script from the feature branch and require exit code 0. On
Windows PowerShell use the `.ps1` script; otherwise use Bash. Stop on any
failure and show stderr.

- Bash: `.specify/scripts/bash/finish-feature.sh`
- PowerShell: `.specify/scripts/powershell/finish-feature.ps1`

The script reads the branch with `git symbolic-ref --short HEAD`. Do not use
`git rev-parse --abbrev-ref HEAD` (exit 128 when the repository has no commits).
When `main` does not exist yet, the script points `main` at the first commit of
the feature (`git rev-list --max-parents=0 HEAD`, the specify commit when that
commit is the root) and then runs `git checkout main` and
`git merge --no-ff`. When `main` already exists, it leaves that branch where it
is and runs the same `git merge --no-ff`. The script exits 1 when the working
tree is dirty or when the merge does not create a merge commit. Do not use
`--force` or reset.

## Pull request

When the work is ready for review, recommend that the developer open a pull
request. Tell them the body will follow `.github/pull_request_template.md`
(the project's established format). Apply judgment («recomendado; aplica
criterio»). Until the developer accepts, do not push and do not open the pull
request.

When the developer accepts, create and publish the pull request yourself. The
developer does not assemble it by hand. The agent never merges it.

- Base: the project's integration branch. Use `testing` when that branch
  exists; otherwise use the integration ref from `.specify/hygiene.yml`.
- Title: Conventional Commits 1.0.0.
- **Qué y por qué** and **Fuera de alcance** come from `spec.md`.
- **Spec/tarea** names the feature directory and the completed tasks in
  `tasks.md`.
- **Riesgos/rollback** comes from `plan.md`.
- **Cómo se validó** includes the output of `check-hygiene`
  (`.specify/scripts/bash/check-hygiene.sh`, or the PowerShell variant).

`check-pr-body` only warns. A missing body does not fail CI. The same steps
apply whenever the developer asks to create a pull request.

## Conventional Commits during implementation

Commit after each task or logical group on the feature branch. Every message
MUST follow Conventional Commits 1.0.0
(https://www.conventionalcommits.org/en/v1.0.0/):
`<type>[optional scope][!]: <description>`. Allowed types: `feat`, `fix`,
`docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
The description is imperative, has no trailing period, and the header is at
most 100 characters. Before `git commit`, require exit code 0 from:

- Bash: `.specify/scripts/bash/check-commit-msg.sh "<message>"`
- PowerShell: `.specify/scripts/powershell/check-commit-msg.ps1 "<message>"`

Examples: `feat(auth): add login form`, `test(api): cover refresh token reuse`.
Do not use `speckit.implement` or `[Spec Kit]` as the commit message.

{CORE_TEMPLATE}
