#!/usr/bin/env bash
# H7. Production accepts only the configured integration refs.
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
. "$here/hygiene-lib.sh"

config=""
base="${GITHUB_BASE_REF:-}"
head="${GITHUB_HEAD_REF:-}"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --config) config=$2; shift 2 ;;
    --base) base=$2; shift 2 ;;
    --head) head=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

prod=$(hygiene_yaml_value production_branch "$config")
refs=$(hygiene_yaml_list integration_refs "$config")
if [ -z "$prod" ] || [ "$base" != "$prod" ]; then
  exit 0
fi

for ref in $refs; do
  [ "$ref" = "*" ] && exit 0
  case "$ref" in
    *\*)
      prefix=${ref%\*}
      case "$head" in
        ${prefix}*) exit 0 ;;
      esac
      ;;
    *)
      [ "$head" = "$ref" ] && exit 0
      ;;
  esac
done

echo "a ${prod} solo se llega desde: ${refs}" >&2
exit 1
