#!/usr/bin/env bash
# Validate one Conventional Commits 1.0.0 message (file path or literal).
set -eu

if [ "$#" -ne 1 ]; then
  echo "uso: check-commit-msg.sh <archivo-o-mensaje>" >&2
  exit 2
fi

if [ -f "$1" ]; then
  msg=$(cat -- "$1")
else
  msg=$1
fi

first=${msg%%$'\n'*}
first=${first%$'\r'}

if [ -z "$first" ]; then
  echo "mensaje de commit vacío" >&2
  exit 1
fi

case "$first" in
  "Merge "*|"Revert \""*|fixup!*|squash!*)
    exit 0
    ;;
esac

if [ "${#first}" -gt 100 ]; then
  echo "el encabezado supera 100 caracteres (${#first})" >&2
  exit 1
fi

types='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
pattern="^(${types})(\\([A-Za-z0-9][A-Za-z0-9._/-]*\\))?(!)?: [^[:space:]].*[^.]$|^(${types})(\\([A-Za-z0-9][A-Za-z0-9._/-]*\\))?(!)?: [^[:space:].]$"

if ! printf '%s\n' "$first" | grep -Eq "$pattern"; then
  echo "el mensaje no cumple Conventional Commits 1.0.0: ${first}" >&2
  exit 1
fi
