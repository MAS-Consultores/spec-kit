#!/usr/bin/env bash
# H4 / H10 / H12 / H14. H4 blocks only when h4_mode is block (B→).
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
. "$here/hygiene-lib.sh"

config=""
numstat=""
labels=""
body=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --config) config=$2; shift 2 ;;
    --numstat) numstat=$2; shift 2 ;;
    --labels) labels=$2; shift 2 ;;
    --body) body=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$config" ] || [ -z "$numstat" ]; then
  echo "uso: check-pr-size.sh --config hygiene.yml --numstat numstat.txt" >&2
  exit 2
fi

mode=$(hygiene_yaml_value h4_mode "$config")
[ -n "$mode" ] || mode=warn
warn_at=$(hygiene_yaml_value own_code_warn "$config")
block_at=$(hygiene_yaml_value own_code_block "$config")
[ -n "$warn_at" ] || warn_at=800
[ -n "$block_at" ] || block_at=1500

excludes=$(hygiene_yaml_list size_excludes "$config")
set -f
# shellcheck disable=SC2086
set -- $excludes
set +f

own=0
specs=""
saw_kit=0
saw_vendor=0
saw_prod=0
saw_any=0
while IFS="$(printf '\t')" read -r added deleted path; do
  [ -n "${path:-}" ] || continue
  saw_any=1
  case "$path" in
    .specify/*|.agents/*|.cursor/*) saw_kit=1 ;;
    vendor/*|*/vendor/*) saw_vendor=1 ;;
  esac
  if hygiene_excluded "$path" "$@"; then
    continue
  fi
  case "$path" in
    .specify/*|.agents/*|.cursor/*) ;;
    *)
      saw_prod=1
      own=$((own + added))
      ;;
  esac
  case "$path" in
    specs/[0-9][0-9][0-9]-*/*|specs/[0-9][0-9][0-9]-*)
      dir=${path#specs/}
      dir=${dir%%/*}
      case " $specs " in
        *" $dir "*) ;;
        *) specs="$specs $dir" ;;
      esac
      ;;
  esac
done < "$numstat"

if [ "$saw_any" -eq 0 ]; then
  echo "INFORMA: el diff no tiene cambios" >&2
  exit 0
fi

spec_count=0
for dir in $specs; do
  spec_count=$((spec_count + 1))
done

fail=0
if [ "$own" -gt "$warn_at" ]; then
  echo "AVISO: ${own} líneas propias (umbral ${warn_at})" >&2
fi
if [ "$own" -gt "$block_at" ] || [ "$spec_count" -gt 1 ]; then
  justified=0
  case ",$labels," in
    *,pr-grande-justificado,*) justified=1 ;;
  esac
  if [ "$justified" -eq 1 ] && [ -n "$body" ] && grep -q 'pr-grande' "$body"; then
    echo "AVISO: presupuesto superado con pr-grande-justificado" >&2
  elif [ "$mode" = "block" ]; then
    echo "presupuesto de código propio o más de un spec" >&2
    fail=1
  else
    echo "INFORMA: presupuesto de código propio o más de un spec (h4_mode=warn)" >&2
  fi
fi

if [ "$saw_kit" -eq 1 ] && [ "$saw_prod" -eq 1 ]; then
  echo "INFORMA: el diff mezcla Spec Kit o agentes con código de producción" >&2
fi
if [ "$saw_vendor" -eq 1 ] && [ "$saw_prod" -eq 1 ]; then
  echo "INFORMA: el diff mezcla vendor con código de producción" >&2
fi

exit "$fail"
