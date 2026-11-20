#!/usr/bin/env bash
# Point main at the feature root when that branch does not exist yet, then
# merge the feature with --no-ff. Exit 1 when the work tree is dirty or the
# merge does not create a merge commit.

set -euo pipefail

fail() {
    echo "ERROR: $*" >&2
    exit 1
}

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not inside a git work tree"

if [ -n "$(git status --porcelain)" ]; then
    fail "working tree is dirty"
fi

feature="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
if [ -z "$feature" ]; then
    fail "detached HEAD"
fi

case "$feature" in
    main|master)
        fail "refusing to finish from '$feature'"
        ;;
esac

if ! printf '%s\n' "$feature" | grep -Eq '^[0-9]+-[A-Za-z0-9]'; then
    fail "'$feature' is not a feature branch"
fi

feature_sha="$(git rev-parse HEAD 2>/dev/null || true)"
if [ -z "$feature_sha" ]; then
    fail "feature branch has no commits"
fi

if ! git show-ref --verify --quiet refs/heads/main; then
    root="$(git rev-list --max-parents=0 HEAD | head -n 1)"
    if [ -z "$root" ]; then
        fail "cannot find the root commit"
    fi
    git branch main "$root"
fi

git checkout main
git merge --no-ff "$feature" -m "Merge $feature"

# rev-list prints "<commit> <parent>..." ; a merge commit has exactly two parents.
set -- $(git rev-list --parents -n 1 HEAD)
if [ "$#" -ne 3 ]; then
    fail "merge did not produce a merge commit"
fi

second="$(git rev-parse HEAD^2)"
if [ "$second" != "$feature_sha" ]; then
    fail "feature tip is not the second parent"
fi

if [ -n "$(git status --porcelain)" ]; then
    fail "working tree is dirty after merge"
fi

exit 0
