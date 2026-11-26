#!/usr/bin/env bash
# H3. Harness stacks block. Legacy stacks inform.
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
. "$here/hygiene-lib.sh"

config=""
numstat=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --config) config=$2; shift 2 ;;
    --numstat) numstat=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

harness=$(hygiene_yaml_value harness "$config")
threshold=$(hygiene_yaml_value test_line_threshold "$config")
[ -n "$threshold" ] || threshold=300
globs=$(hygiene_yaml_list test_globs "$config")
excludes=$(hygiene_yaml_list size_excludes "$config")
set -f

prod=0
tests=0
while IFS="$(printf '\t')" read -r added _deleted path; do
  [ -n "${path:-}" ] || continue
  excluded=0
  for rule in $excludes; do
    if hygiene_excluded "$path" "$rule"; then
      excluded=1
    fi
  done
  [ "$excluded" -eq 1 ] && continue
  is_test=0
  for glob in $globs; do
    # shellcheck disable=SC2254
    case "$path" in
      $glob) is_test=1 ;;
    esac
  done
  if [ "$is_test" -eq 1 ]; then
    tests=$((tests + 1))
  else
    prod=$((prod + added))
  fi
done < "$numstat"

if [ "$prod" -gt "$threshold" ] && [ "$tests" -eq 0 ]; then
  if [ "$harness" = "true" ]; then
    echo "más de ${threshold} líneas de producción sin tests" >&2
    exit 1
  fi
  echo "INFORMA: más de ${threshold} líneas sin tests; hace falta Validación manual" >&2
fi
exit 0
