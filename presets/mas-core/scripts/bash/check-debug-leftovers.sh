#!/usr/bin/env bash
# H13. Debug on added lines blocks. Deleting protected files informs.
set -eu

diff=""
protected=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --diff) diff=$2; shift 2 ;;
    --deleted) protected=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

fail=0
if [ -n "$diff" ]; then
  while IFS= read -r line; do
    case "$line" in
      +++*) continue ;;
      +*)
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
