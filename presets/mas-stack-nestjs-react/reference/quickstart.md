# Quickstart

Copy `.env.example` to `.env` and replace the placeholders. From the repo root, `pnpm dev` loads that file (`node --env-file-if-exists=.env`) and starts `@demo/api` (`nest start --watch`, port `PORT`) and `@demo/web` (`vite`, port 5173) together. Vite reads the same root `.env` for `API_PROXY_TARGET`.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Other workspace commands use `pnpm --filter` with the `package.json` name (`@demo/api`, `@demo/web`), not the directory name alone.

When a feature spec ships `specs/<feature>/fidelity-map.json`, `pnpm test:fidelity` compares computed style with the prototype, including hover, active, and `data-icon`. It does not take screenshots. `pnpm lint` is the primary gate for icons and colors.

A new domain is `pnpm gen:module <dominio>`. `pnpm lint` must stay at 0. It includes dependency-cruiser, the negative fixtures, and `scripts/lint-migrations.mjs`.

Commits use Conventional Commits 1.0.0 (`type(scope): description`). `pnpm install` points `core.hooksPath` at `.githooks` when this directory is the git root. `commit-msg` runs `pnpm exec commitlint --edit`. Init does not change `.git`; if the hook did not install, copy `.specify/templates/githooks/commit-msg` only when you are outside this skeleton. The job `commits` in `.github/workflows/commits.yml` checks the pull request title and the commits from the merge base.

`pnpm db:setup` migrates `DATABASE_URL` and seeds. With `SEED_DATABASE_URL` unset, that seed uses `DATABASE_URL` only for `127.0.0.1`, `localhost`, or `::1`. With `SEED_DATABASE_URL` set, it must be a different database (CI and e2e). Production runs `prisma migrate deploy` only.
