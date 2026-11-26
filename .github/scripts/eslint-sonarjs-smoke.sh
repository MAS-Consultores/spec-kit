#!/usr/bin/env bash
# Pin: eslint 9.39.1 + eslint-plugin-sonarjs 3.0.1. 3.0.5 throws FunctionType.
set -eu
repo=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
config="$repo/presets/mas-stack-laravel-inertia-react/templates/eslint.clean.config.mjs"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/resources/js"
cp "$config" "$work/eslint.clean.config.mjs"
cat >"$work/resources/js/bad.js" <<'EOF'
function tooComplex(value) {
  if (value) {
    if (value) {
      if (value) {
        if (value) {
          if (value) {
            if (value) {
              if (value) {
                if (value) {
                  return value;
                }
              }
            }
          }
        }
      }
    }
  }
  return 0;
}
EOF
cat >"$work/resources/js/good.js" <<'EOF'
function fine(value) {
  return value;
}
EOF
(
  cd "$work"
  npm init -y >/dev/null
  npm install --silent eslint@9.39.1 eslint-plugin-sonarjs@3.0.1
  set +e
  npx eslint --no-config-lookup -c eslint.clean.config.mjs resources/js/bad.js >bad.out 2>bad.err
  bad_rc=$?
  npx eslint --no-config-lookup -c eslint.clean.config.mjs resources/js/good.js >good.out 2>good.err
  good_rc=$?
  set -e
  if [ "$bad_rc" -ne 1 ] || ! grep -q sonarjs bad.out bad.err; then
    echo "eslint sonarjs debio fallar el archivo malo (rc=$bad_rc)" >&2
    cat bad.out bad.err >&2
    exit 1
  fi
  if [ "$good_rc" -ne 0 ]; then
    echo "eslint sonarjs debio aceptar el archivo bueno (rc=$good_rc)" >&2
    cat good.out good.err >&2
    exit 1
  fi
)
echo "eslint sonarjs ok"
