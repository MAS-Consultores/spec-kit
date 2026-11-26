#!/usr/bin/env bash
# Clean code on the diff. Legacy informs. Harness stacks block new findings.
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
. "$here/hygiene-lib.sh"

config=""
findings=""
baseline=""
mode=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --config) config=$2; shift 2 ;;
    --findings) findings=$2; shift 2 ;;
    --baseline) baseline=$2; shift 2 ;;
    --mode) mode=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$mode" ] && [ -n "$config" ]; then
  mode=$(hygiene_yaml_value clean_code_mode "$config")
fi
[ -n "$mode" ] || mode=info

if [ -z "$findings" ]; then
  echo "INFORMA: sin hallazgos de clean code (phpmd, eslint o jscpd no se ejecutaron)" >&2
  exit 0
fi

new=0
while IFS= read -r line; do
  [ -n "$line" ] || continue
  if [ -n "$baseline" ] && [ -f "$baseline" ] && grep -Fxq "$line" "$baseline"; then
    continue
  fi
  echo "clean-code: ${line}" >&2
  new=$((new + 1))
done < "$findings"

if [ "$new" -eq 0 ]; then
  exit 0
fi
if [ "$mode" = "block" ]; then
  echo "${new} hallazgos nuevos de clean code" >&2
  exit 1
fi
echo "INFORMA: ${new} hallazgos de clean code (modo info)" >&2
exit 0
