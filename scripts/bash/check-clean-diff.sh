#!/usr/bin/env bash
# Run PHPMD, jscpd and, for JS, ESLint+sonarjs on changed files.
# Only added lines count. info warns; block fails on new findings.
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
. "$here/hygiene-lib.sh"

config=""
findings=""
baseline=""
mode=""
names=""
diff=""
root="."
while [ "$#" -gt 0 ]; do
  case "$1" in
    --config) config=$2; shift 2 ;;
    --findings) findings=$2; shift 2 ;;
    --baseline) baseline=$2; shift 2 ;;
    --mode) mode=$2; shift 2 ;;
    --names) names=$2; shift 2 ;;
    --diff) diff=$2; shift 2 ;;
    --root) root=$2; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$mode" ] && [ -n "$config" ]; then
  mode=$(hygiene_yaml_value clean_code_mode "$config")
fi
[ -n "$mode" ] || mode=info

added_line() {
  file=$1
  line=$2
  [ -n "$diff" ] || return 0
  awk -v file="$file" -v line="$line" '
    $0 ~ /^\+\+\+ / {
      cur = $2
      sub(/^b\//, "", cur)
    }
    $0 ~ /^@@/ && (cur == file || index(cur, file) > 0) {
      if (match($0, /\+[0-9]+/)) {
        start = substr($0, RSTART + 1, RLENGTH - 1) + 0
      }
    }
    cur != "" && (cur == file || index(cur, file) > 0) && $0 ~ /^\+/ && $0 !~ /^\+\+\+/ {
      if (start == line) found = 1
      start++
    }
    END { exit found ? 0 : 1 }
  ' "$diff"
}

record() {
  item=$1
  if [ -n "$baseline" ] && [ -f "$baseline" ] && grep -Fxq "$item" "$baseline"; then
    return 0
  fi
  echo "clean-code: ${item}" >&2
  new=$((new + 1))
}

run_tool() {
  tool=$1
  shift
  if ! command -v "$tool" >/dev/null 2>&1; then
    if [ "$mode" = "block" ]; then
      echo "falta ${tool} para medir el diff" >&2
      missing_tool=1
    else
      echo "INFORMA: falta ${tool}; no se midió el diff" >&2
    fi
    return 0
  fi
  out=$(mktemp)
  set +e
  "$@" >"$out" 2>&1
  set -e
  while IFS= read -r line; do
    case "$line" in
      *:*:*)
        file=${line%%:*}
        rest=${line#*:}
        num=${rest%%:*}
        case "$num" in
          ''|*[!0-9]*) record "$line" ;;
          *)
            if added_line "$file" "$num"; then
              record "$line"
            fi
            ;;
        esac
        ;;
    esac
  done <"$out"
}

new=0
missing_tool=0

if [ -n "$findings" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    record "$line"
  done <"$findings"
fi

if [ -n "$names" ]; then
  langs=""
  [ -n "$config" ] && langs=$(hygiene_yaml_list clean_langs "$config")
  rules="$root/.specify/templates/phpmd.xml"
  [ -f "$rules" ] || rules="$here/../../templates/phpmd.xml"
  eslint_config="$root/eslint.clean.config.mjs"
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    case " $langs " in
      *" php "*)
        case "$path" in
          *.php) run_tool phpmd phpmd "$root/$path" text "$rules" ;;
        esac
        ;;
    esac
    case " $langs " in
      *" js "*|*" ts "*)
        case "$path" in
          *.js|*.jsx|*.ts|*.tsx)
            if [ -f "$eslint_config" ]; then
              run_tool eslint eslint --no-config-lookup -c "$eslint_config" --format unix "$root/$path"
            fi
            ;;
        esac
        ;;
    esac
  done <"$names"
  set --
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    set -- "$@" "$root/$path"
  done <"$names"
  if [ "$#" -gt 0 ]; then
    run_tool jscpd jscpd --silent --reporters console "$@"
  fi
fi

if [ -z "$findings" ] && [ -z "$names" ]; then
  echo "falta la lista de archivos del diff" >&2
  exit 1
fi

if [ "$missing_tool" -eq 1 ]; then
  exit 1
fi
if [ "$new" -eq 0 ]; then
  exit 0
fi
if [ "$mode" = "block" ]; then
  echo "${new} hallazgos nuevos de clean code" >&2
  exit 1
fi
echo "INFORMA: ${new} hallazgos de clean code (modo info)" >&2
exit 0
