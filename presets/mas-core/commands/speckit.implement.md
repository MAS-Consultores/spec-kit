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
`main` with a local merge. Do not push, do not open a pull request, and do not
create a tag. Do not run `git branch`, `git checkout`, or `git merge` yourself.

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

{CORE_TEMPLATE}
