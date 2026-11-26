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

hygiene_strip_html_comments() {
  awk '
    {
      line = $0
      out = ""
      while (length(line) > 0) {
        if (open) {
          end = index(line, "-->")
          if (end == 0) {
            line = ""
            break
          }
          line = substr(line, end + 3)
          open = 0
          continue
        }
        start = index(line, "<!--")
        if (start == 0) {
          out = out line
          line = ""
          break
        }
        out = out substr(line, 1, start - 1)
        line = substr(line, start + 4)
        open = 1
      }
      print out
    }
  '
}
