#!/usr/bin/env bash
# H5 and H8. Added paths only. Data extensions block outside fixtures.
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
. "$here/hygiene-lib.sh"

config=""
names=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --config) config=$2; shift 2 ;;
    --names) names=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$names" ]; then
  echo "uso: check-junk-files.sh [--config hygiene.yml] --names files.txt" >&2
  exit 2
fi

data_paths=""
if [ -n "$config" ]; then
  data_paths=$(hygiene_yaml_list data_paths "$config")
fi

fail=0
while IFS= read -r path; do
  [ -n "$path" ] || continue
  base=${path##*/}
  blocked=0
  case "$base" in
    .DS_Store|Thumbs.db|*.log|tmp-*|*_tmp.*|*.code-workspace|*.orig|*.swp|prueba*.txt|gemini-code-*.md)
      blocked=1 ;;
  esac
  case "$path" in
    *Zone.Identifier*|.idea/*|*/.idea/*) blocked=1 ;;
  esac
  case "$base" in
    *.pfx|*.p12|*.pem|*.key|*.xlsx|*.xls|*.csv|*.sql.gz|*.mbz)
      case "$path" in
        *Test/Fixture/*|*tests/fixtures/*|*fixtures/*) ;;
        *) blocked=1 ;;
      esac
      ;;
  esac
  for prefix in $data_paths; do
    case "$path" in
      ${prefix}*|*/${prefix}*) blocked=1 ;;
    esac
  done
  case "$base" in
    PRD-*.md)
      case "$path" in
        specs/*|docs/*) ;;
        *) echo "INFORMA: mover ${path} a specs/ o docs/" >&2 ;;
      esac
      ;;
  esac
  if [ "$blocked" -eq 1 ]; then
    echo "archivo prohibido: ${path}" >&2
    fail=1
  fi
done < "$names"

exit "$fail"
