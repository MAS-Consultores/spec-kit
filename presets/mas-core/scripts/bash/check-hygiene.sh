#!/usr/bin/env bash
# Run the MAS hygiene checks that can see a git diff. Prints a summary.
set -eu
root=$(git rev-parse --show-toplevel)
cd "$root"
config="${1:-.specify/hygiene.yml}"
base=$(git merge-base HEAD origin/HEAD 2>/dev/null || git merge-base HEAD HEAD^ 2>/dev/null || true)
if [ -z "$base" ]; then
  echo "INFORMA: no hay merge-base; no se midió el diff" >&2
  exit 0
fi
tmp=$(mktemp -d)
git diff --numstat "${base}..HEAD" > "$tmp/numstat"
git diff --diff-filter=A --name-only "${base}..HEAD" > "$tmp/added"
git diff --unified=0 "${base}..HEAD" > "$tmp/diff"
fail=0
bash "$root/.specify/scripts/bash/check-pr-size.sh" --config "$config" --numstat "$tmp/numstat" || fail=1
bash "$root/.specify/scripts/bash/check-junk-files.sh" --config "$config" --names "$tmp/added" || fail=1
bash "$root/.specify/scripts/bash/check-tests-in-diff.sh" --config "$config" --numstat "$tmp/numstat" || fail=1
bash "$root/.specify/scripts/bash/check-debug-leftovers.sh" --diff "$tmp/diff" || fail=1
git diff --name-only "${base}..HEAD" > "$tmp/names"
bash "$root/.specify/scripts/bash/check-clean-diff.sh" --config "$config" --names "$tmp/names" --diff "$tmp/diff" --root "$root" || fail=1
if [ -n "${GITHUB_BASE_REF:-}" ]; then
  bash "$root/.specify/scripts/bash/check-base-branch.sh" --config "$config" || fail=1
fi
if [ -n "${PR_BODY_FILE:-}" ]; then
  bash "$root/.specify/scripts/bash/check-pr-body.sh" --title "${PR_TITLE:-}" "$PR_BODY_FILE" || true
fi
echo "resumen de higiene: fail=${fail}"
exit "$fail"
