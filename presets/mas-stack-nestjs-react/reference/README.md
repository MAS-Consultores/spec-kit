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

Postgres on a new machine often has no cluster and no `postgresql.conf`. `scripts/ensure-postgres.sh` exits 1 and prints `initdb -D "$PGDATA"` when `PGDATA` has no config, or when the server is down. Create two databases and keep the URLs different:

```bash
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app
export SEED_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/e2e
bash scripts/ensure-postgres.sh
```

`pnpm db:migrate` migrates `DATABASE_URL`. An empty `DATABASE_URL` or `SEED_DATABASE_URL` is unset and does not fall through to the other variable. Migrate both databases, then seed the e2e database twice:

```bash
pnpm db:migrate
DATABASE_URL="$SEED_DATABASE_URL" pnpm --filter @demo/api exec prisma migrate deploy
pnpm db:seed
pnpm db:seed
```

`prisma db seed` refuses to run unless `SEED_DATABASE_URL` is set and different from `DATABASE_URL`. The dev database is not seeded by that command.

Vite proxies `/api` to `API_PROXY_TARGET` for `dev` and `preview`. Playwright opens the web origin and calls the API through that proxy. Set `CORS_ORIGIN` only when a browser calls the API host directly; that switch enables credentialed CORS.

Playwright does not download browsers during `pnpm install`. If chromium is missing, `node scripts/ensure-playwright.mjs` (from `apps/web`) exits 1 and tells you to run `pnpm exec playwright install chromium`. Dev servers do not assume ports 3000, 4173, or 5432 are free. Playwright binds a free port and reuses a saved pair only when both ports are free or both servers still answer. A dead listener is discarded, so two Playwright runs in a row do not share it. If 5432 is busy, point `DATABASE_URL` and `SEED_DATABASE_URL` at the port that is listening.

## Known warnings that do not fail CI

Prisma 7 prints that Node majors above 24 are outside its narrow preinstall table. The Active LTS (26) is inside `engines.node` (`>=24`) and the warning is not a failure. pnpm may warn that some Nest packages declare peers up to Nest 11. Those peers are allowed in `pnpm-workspace.yaml` `peerDependencyRules`. Do not use `pnpm approve --all`.
