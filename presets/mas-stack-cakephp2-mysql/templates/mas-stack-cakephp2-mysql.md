# MAS Stack Scaffold: CakePHP 2.x + MySQL

This placeholder marks the bundled MAS stack preset for legacy CakePHP 2.x and
MySQL projects. Future slices will add stack-specific templates, commands,
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
