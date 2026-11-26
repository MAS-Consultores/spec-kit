#!/usr/bin/env bash
# H13. Debug on added lines blocks. Deleting protected files informs.
# Skips the hygiene scripts, Markdown, the .specify/ tree, and
# debug_leftovers_exclude from hygiene.yml.
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
. "$here/hygiene-lib.sh"

diff=""
protected=""
config=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --diff) diff=$2; shift 2 ;;
    --deleted) protected=$2; shift 2 ;;
    --config) config=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

excludes=""
if [ -n "$config" ] && [ -f "$config" ]; then
  excludes=$(hygiene_yaml_list debug_leftovers_exclude "$config" || true)
fi

debug_skip() {
  path=$1
  case "$path" in
    "") return 1 ;;
    *.md|.specify|.specify/*|*/.specify|*/.specify/*) return 0 ;;
    check-debug-leftovers.sh|check-debug-leftovers.ps1|*/check-debug-leftovers.sh|*/check-debug-leftovers.ps1) return 0 ;;
    scripts/bash/check-*.sh|scripts/powershell/check-*.ps1|*/scripts/bash/check-*.sh|*/scripts/powershell/check-*.ps1) return 0 ;;
  esac
  if [ -n "$excludes" ]; then
    # shellcheck disable=SC2086
    set -f
    # shellcheck disable=SC2086
    if hygiene_excluded "$path" $excludes; then
      set +f
      return 0
    fi
    set +f
  fi
  return 1
}

fail=0
file=""
if [ -n "$diff" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "+++ "*)
        file=${line#+++ }
        file=${file%%$'\t'*}
        case "$file" in
          b/*) file=${file#b/} ;;
        esac
        case "$file" in
          /dev/null) file="" ;;
        esac
        continue
        ;;
      +++*) continue ;;
      +*)
        if debug_skip "$file"; then
          continue
        fi
        case "$line" in
          *var_dump*|*print_r*|*error_log\(*|*"dd("*|*"dump("*|*"console.log"*|*debugger*|*"ray("*)
            echo "MAS-DEBUG dd( ${line}" >&2
            fail=1
            ;;
        esac
        ;;
    esac
  done < "$diff"
fi

if [ -n "$protected" ]; then
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    case "$path" in
      .env.example|.dockerignore|.gitignore|.github|".github/"*|.github/*)
        echo "INFORMA: se borró un archivo protegido: ${path}" >&2
        ;;
    esac
  done < "$protected"
fi

exit "$fail"
