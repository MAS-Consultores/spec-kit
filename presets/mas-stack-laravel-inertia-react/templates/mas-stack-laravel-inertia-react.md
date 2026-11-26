# MAS Stack Scaffold: Laravel + Inertia + React

This placeholder marks the bundled MAS stack preset for Laravel, Inertia, and
React projects. Future slices will add stack-specific templates, commands,
security guidelines, and memory materialization.

## Conventional Commits

`specify init` does not change `.git`. Activate the shared commit-msg hook once:

```bash
mkdir -p .githooks
cp .specify/templates/githooks/commit-msg .githooks/commit-msg
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks
```

Copy `.specify/templates/ci/conventional-commits.yml` to
`.github/workflows/conventional-commits.yml`. The workflow has
`permissions: contents: read` and checks the pull request title and every
commit from the merge base to HEAD with `.specify/scripts/bash/check-commit-msg.sh`.

## Higiene y código limpio

Incluye la base mas-core. Larastan usa baseline. El back mide PHPMD y jscpd. El front mide ESLint con sonarjs y jscpd (`templates/eslint.clean.config.mjs`) solo sobre archivos tocados. Más de 300 líneas sin tests en `tests/` o Vitest bloquean. `storage/app/` no se versiona.
