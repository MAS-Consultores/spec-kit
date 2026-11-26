#!/usr/bin/env bash
# Exit 0 and print "evidence" when the diff needs validation and rollback.
# Paths and whole words only. "@author" is not authentication.
set -eu
names=""
diff=""
title=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --names) names=$2; shift 2 ;;
    --diff) diff=$2; shift 2 ;;
    --title) title=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

hit=0
if [ -n "$names" ]; then
  while IFS= read -r path; do
    case "$path" in
      auth/*|*/auth/*|login/*|*/login/*|*password*)
        hit=1
        ;;
      composer.json|composer.lock|package.json|pnpm-lock.yaml|package-lock.json)
        hit=1
        ;;
    esac
  done <"$names"
fi

if [ -n "$diff" ]; then
  if grep -E '^\+' "$diff" | grep -E -q '(^|[^[:alnum:]_])(password|credential|token|secret|revert)([^[:alnum:]_]|$)'; then
    hit=1
  fi
fi

case "$title" in
  *[Rr]evert*|*[Uu]pgrade*|*[Bb]ump*) hit=1 ;;
esac

if [ "$hit" -eq 1 ]; then
  echo evidence
fi
exit 0
