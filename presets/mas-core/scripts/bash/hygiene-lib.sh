#!/usr/bin/env bash
# Shared helpers for MAS hygiene checks. Sourced by the check-*.sh scripts.
set -eu

hygiene_yaml_value() {
  key=$1
  file=$2
  awk -v key="$key" '
    $0 ~ "^" key ":[[:space:]]*" {
      sub("^" key ":[[:space:]]*", "")
      gsub(/"/, "")
      print
      exit
    }
  ' "$file"
}

hygiene_yaml_list() {
  key=$1
  file=$2
  awk -v key="$key" '
    $0 ~ "^" key ":[[:space:]]*$" { on=1; next }
    on && /^[^[:space:]-]/ { exit }
    on && /^[[:space:]]*-[[:space:]]*/ {
      sub(/^[[:space:]]*-[[:space:]]*/, "")
      gsub(/"/, "")
      print
    }
  ' "$file"
}

hygiene_excluded() {
  path=$1
  shift
  base=${path##*/}
  for rule in "$@"; do
    [ -z "$rule" ] && continue
    case "$rule" in
      */)
        case "$path" in
          ${rule}*|*/${rule}*) return 0 ;;
        esac
        ;;
      *)
        if [ "$base" = "$rule" ] || [ "$path" = "$rule" ]; then
          return 0
        fi
        case "$path" in
          ${rule}/*|*/${rule}/*) return 0 ;;
        esac
        ;;
    esac
  done
  return 1
}

hygiene_strip_coderabbit() {
  awk '
    /<!--[[:space:]]*coderabbit[[:space:]]*-->/ { skip=1; next }
    /<!--[[:space:]]*\/coderabbit[[:space:]]*-->/ { skip=0; next }
    skip == 0 { print }
  '
}
