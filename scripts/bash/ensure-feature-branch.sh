#!/usr/bin/env bash
# Exit 1 when HEAD is main, master, detached, or not a feature branch.
# A feature branch matches NNN-short-name (or a longer numeric prefix).
# When .specify/feature.json names a feature_directory, HEAD must equal its basename.

set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "ERROR: not inside a git work tree" >&2
    exit 1
fi

head="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
if [ -z "$head" ]; then
    echo "ERROR: detached HEAD is not a feature branch" >&2
    exit 1
fi

case "$head" in
    main|master)
        echo "ERROR: refusing to continue on '$head'" >&2
        exit 1
        ;;
esac

if ! printf '%s\n' "$head" | grep -Eq '^[0-9]+-[A-Za-z0-9]'; then
    echo "ERROR: '$head' is not a feature branch" >&2
    exit 1
fi

repo="$(git rev-parse --show-toplevel)"
feature_json="$repo/.specify/feature.json"
if [ -f "$feature_json" ]; then
    if command -v jq >/dev/null 2>&1; then
        feature_dir="$(jq -r '.feature_directory // empty' "$feature_json")"
    else
        feature_dir="$(sed -n 's/.*"feature_directory"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$feature_json" | head -n 1)"
    fi
    if [ -n "$feature_dir" ]; then
        base="${feature_dir%/}"
        base="${base##*/}"
        if [ "$head" != "$base" ]; then
            echo "ERROR: HEAD '$head' does not match feature directory '$base'" >&2
            exit 1
        fi
    fi
fi

exit 0
