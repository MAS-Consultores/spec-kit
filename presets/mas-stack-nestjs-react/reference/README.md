# NestJS + React reference

This tree is the version set that passed CI. `specify init --stack nestjs-react` copies it to `.specify/reference/`. New projects copy these `package.json` files and `pnpm-lock.yaml`. Renovate updates only this skeleton, and that pull request must pass the smoke workflow.

## Clean machine

Node is the Active LTS in `.nvmrc`. Corepack is not bundled on Node 25+. Do not install it into `/usr`.

Linux and macOS, with a user prefix:

```bash
npm config set prefix ~/.local
export PATH="$HOME/.local/bin:$PATH"
npm i -g corepack@latest
corepack enable
```

Or install Node with nvm and load it before `pnpm`:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use
```

Windows: nvm-windows, or `npm config set prefix %USERPROFILE%\.local` and add that directory to the user PATH. Then the same `npm i -g corepack@latest` and `corepack enable`.

Copy `.env.example` to `.env` and replace the placeholders. `node scripts/check-env-example.mjs` fails when the app reads an environment name that the example does not list.

## Quickstart

`pnpm dev` from this directory loads the root `.env` (`node --env-file-if-exists=.env`) and starts `@demo/api` and `@demo/web` together. The API uses `PORT` (3001 in the example). Vite serves the web app on 5173 and proxies `/api` to `API_PROXY_TARGET`. The same file is documented in `quickstart.md`. Vite also reads that root `.env` when you start `@demo/web` on its own.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

`pnpm test:fidelity` compares computed style with an HTML prototype when `specs/<feature>/fidelity-map.json` exists. With no map it exits 0. It does not take screenshots. It compares computed color (not `:root` variables), hover, active, and `data-icon`, and runs axe `color-contrast`. `pnpm lint` is the primary gate for the icon package in `apps/web/ui.icons.json` and for literal colors. `pnpm verify` runs both.

`pnpm lint` is ESLint plus dependency-cruiser plus the negative fixtures. `pnpm gen:module <dominio>` adds a Nest module, a lazy web feature, a contract entry, and a Prisma file. It only edits `AppModule`, `feature-routes.ts`, and `eslint/model-ownership.js`. `pnpm schema:check` requires one `.prisma` file per domain under `prisma/schema/`.

Postgres on a new machine often has no cluster and no `postgresql.conf`. `scripts/ensure-postgres.sh` exits 1 and prints `initdb -D "$PGDATA"` when `PGDATA` has no config, or when the server is down.

One local database: leave `SEED_DATABASE_URL` unset and point `DATABASE_URL` at `127.0.0.1`, `localhost`, or `::1`. `pnpm db:setup` migrates and seeds that database. Any other host is refused.

```bash
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app
unset SEED_DATABASE_URL
bash scripts/ensure-postgres.sh
pnpm db:setup
```

CI and e2e set `SEED_DATABASE_URL` to a different database. `pnpm db:migrate` still migrates only `DATABASE_URL`. An empty `DATABASE_URL` does not fall through to `SEED_DATABASE_URL`. Migrate the e2e database, then seed it twice:

```bash
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app
export SEED_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/e2e
pnpm db:migrate
DATABASE_URL="$SEED_DATABASE_URL" pnpm --filter @demo/api exec prisma migrate deploy
pnpm db:seed
pnpm db:seed
```

When `SEED_DATABASE_URL` is set, `prisma db seed` refuses to run if it is the same string as `DATABASE_URL`. The seed is for local setup and e2e, not for production deploy.

Vite proxies `/api` to `API_PROXY_TARGET` for `dev` and `preview`. Playwright opens the web origin and calls the API through that proxy. Set `CORS_ORIGIN` only when a browser calls the API host directly; that switch enables credentialed CORS.

Playwright does not download browsers during `pnpm install`. If chromium is missing, `node scripts/ensure-playwright.mjs` (from `apps/web`) exits 1 and tells you to run `pnpm exec playwright install chromium`. Dev servers do not assume ports 3000, 4173, or 5432 are free. Playwright binds a free port and reuses a saved pair only when both ports are free or both servers still answer. A dead listener is discarded, so two Playwright runs in a row do not share it. If 5432 is busy, point `DATABASE_URL` and `SEED_DATABASE_URL` at the port that is listening.

## Known warnings that do not fail CI

Prisma 7 prints that Node majors above 24 are outside its narrow preinstall table. The Active LTS (26) is inside `engines.node` (`>=24`) and the warning is not a failure. pnpm may warn that some Nest packages declare peers up to Nest 11. Those peers are allowed in `pnpm-workspace.yaml` `peerDependencyRules`. Do not use `pnpm approve --all`.

`pnpm audit` ignores `GHSA-fc5q-39xc-vjpf` (picomatch ReDoS). The latest stable picomatch is 4.0.7 and the advisory lists no patched release. The package is transitive through shadcn and fast-glob.
