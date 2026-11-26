#!/usr/bin/env bash
# H1: pull request body and generic titles. Recommended. Always informs, never fails.
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
. "$here/hygiene-lib.sh"

promotion=0
evidence=0
title=""
file=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --promotion) promotion=1; shift ;;
    --evidence) evidence=1; shift ;;
    --title) title=$2; shift 2 ;;
    *) file=$1; shift ;;
  esac
done

if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "uso: check-pr-body.sh [--promotion] [--title T] <archivo>" >&2
  exit 2
fi

case "$title" in
  "chore(release): promover"*) promotion=1 ;;
esac

body=$(hygiene_strip_coderabbit < "$file" | python3 -c 'import re,sys; sys.stdout.write(re.sub(r"<!--.*?-->", "", sys.stdin.read(), flags=re.S))')
required="Qué y por qué|Spec/tarea|Cómo se validó|Riesgos/rollback|Fuera de alcance"
missing=0
block=0
IFS='|'
for heading in $required; do
  section=$(printf '%s\n' "$body" | awk -v h="$heading" '
    $0 ~ "^##[[:space:]]+" h "[[:space:]]*$" { on=1; next }
    on && /^##[[:space:]]/ { exit }
    on { print }
  ')
  if ! printf '%s\n' "$section" | grep -Eq '[^[:space:]]'; then
    if [ "$evidence" -eq 1 ] && { [ "$heading" = "Cómo se validó" ] || [ "$heading" = "Riesgos/rollback" ]; }; then
      echo "falta ${heading}: el PR trae otro hallazgo (tests, auth, upgrade o revert)" >&2
      block=1
    else
      echo "INFORMA: falta contenido en: ${heading}" >&2
      missing=1
    fi
  fi
done
unset IFS

if [ "$promotion" -eq 1 ]; then
  if ! printf '%s\n' "$body" | grep -Eq '#[0-9]+'; then
    echo "INFORMA: la promoción no lista los PRs incluidos" >&2
    missing=1
  fi
  if ! printf '%s\n' "$body" | grep -q 'hallazgos de seguridad resueltos'; then
    echo "INFORMA: la promoción no trae el checklist de seguridad" >&2
    missing=1
  fi
fi

if [ -n "$title" ]; then
  case "$title" in
    "chore(release): promover"*) ;;
    *)
      desc=${title#*: }
      low=$(printf '%s' "$desc" | tr '[:upper:]' '[:lower:]')
      words=$(printf '%s' "$low" | tr -c '[:alnum:]' ' ')
      count=0
      for word in $words; do
        if [ "${#word}" -ge 3 ]; then
          count=$((count + 1))
        fi
      done
      if printf '%s\n' "$low" | grep -Eq '^(testing|update|cambios( sp)?|fix[0-9]*|pruebas|modificaciones|pedidas|qa moni|fixs qas)$' || [ "$count" -lt 3 ]; then
        echo "INFORMA: título genérico, recomendado ampliarlo: ${title}" >&2
      fi
      ;;
  esac
fi

if [ "$missing" -ne 0 ]; then
  echo "INFORMA: el cuerpo del PR es recomendado; aplica criterio" >&2
fi
if [ "$block" -eq 1 ]; then
  exit 1
fi
exit 0
