---
description: Execute MAS implementation on the feature branch, then merge locally to main.
strategy: wrap
---

## MAS Feature Branch Check

Before implementing, verify the git branch. Read `.specify/feature.json` and require
`feature_directory`. `git rev-parse --abbrev-ref HEAD` must equal the basename of
that directory. If the directory is missing, HEAD is `main` or `master`, or the
names differ, return `HARD_FAIL` and stop. Do not create a branch here and do not
implement on `main`.

## MAS Local Merge To Main

After every task in `tasks.md` is done and the project's checks pass, finish on
`main` with a local merge. Do not push, do not open a pull request, and do not
create a tag.

1. `FEATURE_BRANCH=$(git rev-parse --abbrev-ref HEAD)`.
2. If `main` does not exist, `git branch main`.
3. `git checkout main`.
4. `git merge --no-ff "$FEATURE_BRANCH" -m "Merge $FEATURE_BRANCH"`.
5. If checkout or merge fails, stop and report the git error. Do not use `--force` or reset.

{CORE_TEMPLATE}
