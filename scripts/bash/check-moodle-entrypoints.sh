#!/usr/bin/env bash
# H9. New Moodle entry PHP must require login, or declare why it is public.
set -eu

names=""
root=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --names) names=$2; shift 2 ;;
    --root) root=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

fail=0
while IFS= read -r path; do
  [ -n "$path" ] || continue
  case "$path" in
    *.php) ;;
    *) continue ;;
  esac
  case "$path" in
    */classes/*|*/db/*|*/lang/*|*/tests/*|*/amd/*) continue ;;
  esac
  file="$path"
  if [ -n "$root" ]; then
    file="$root/$path"
  fi
  if [ ! -f "$file" ]; then
    echo "no se puede leer ${path}" >&2
    fail=1
    continue
  fi
  if grep -Eq 'require_login[[:space:]]*\(|require_capability[[:space:]]*\(|mas-hygiene: public' "$file"; then
    continue
  fi
  echo "entrypoint sin require_login ni declaración pública: ${path}" >&2
  fail=1
done < "$names"

exit "$fail"
