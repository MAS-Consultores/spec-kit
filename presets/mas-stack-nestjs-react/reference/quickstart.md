# Quickstart

Copy `.env.example` to `.env` and replace the placeholders. From the repo root, `pnpm dev` loads that file (`node --env-file-if-exists=.env`) and starts `@demo/api` (`nest start --watch`, port `PORT`) and `@demo/web` (`vite`, port 5173) together. Vite reads the same root `.env` for `API_PROXY_TARGET`.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Other workspace commands use `pnpm --filter` with the `package.json` name (`@demo/api`, `@demo/web`), not the directory name alone.

When a feature spec ships `specs/<feature>/fidelity-map.json`, `pnpm test:fidelity` compares computed style with the prototype. It does not take screenshots.

A new domain is `pnpm gen:module <dominio>`. `pnpm lint` must stay at 0. It includes dependency-cruiser and the negative fixtures.
