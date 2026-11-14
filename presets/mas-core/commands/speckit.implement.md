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
create a tag.

1. Read the branch with `git symbolic-ref --short HEAD` (Bash: `FEATURE_BRANCH=$(git symbolic-ref --short HEAD)`; PowerShell: `$FEATURE_BRANCH = git symbolic-ref --short HEAD`). Do not use `git rev-parse --abbrev-ref HEAD` (exit 128 when the repository has no commits).
2. If `main` does not exist, `git branch main`.
3. `git checkout main`.
4. `git merge --no-ff "$FEATURE_BRANCH" -m "Merge $FEATURE_BRANCH"`.
5. If checkout or merge fails, stop and report the git error. Do not use `--force` or reset.

{CORE_TEMPLATE}
