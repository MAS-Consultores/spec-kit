# Catálogo de regresiones — `nestjs-react`

Los chequeos de esta tabla se ejecutan. Una búsqueda de texto en la constitution no cuenta como cobertura. «Pendiente» significa que el historial no alcanza para un chequeo ejecutable o que el comportamiento no está en el esqueleto.

## Demo 7 (huecos de esta iteración)

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D7-01 | en un repo nacido vacío, `finish-feature` deja `main` en el commit raíz y crea un merge `--no-ff`; si `main` ya existe, lo conserva; un árbol sucio sale 1 | `64fd9ade` | `tests/test_mas_nestjs_demo7.py` y los pasos de CI «Finish feature on Bash» (Ubuntu y macOS) y «Finish feature on PowerShell» (Windows) |

## Demo 6 (huecos de esta iteración)

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D6-01 | `check-casl.ts` acepta `@Authenticated()` en handlers HTTP; una tool MCP sin `@Can` sigue fallando; un handler sin `@Can`, `@Public` ni `@Authenticated` falla | `cbf536d6` | `tests/test_mas_nestjs_demo6.py` y `pnpm casl` del job `reference` |
| D6-02 | `.env.example` lista las variables que la app lee y `specify init` lo copia | `19d2064d` | `tests/test_mas_nestjs_demo6.py` y `node scripts/check-env-example.mjs` en el esqueleto y tras el reemplazo del slice |
| D6-03 | Vite hace proxy de `/api` en dev y preview; Playwright llama a la API por el origen de la web | `d8d05593` | `node scripts/check-dev-proxy.mjs` y `pnpm test:e2e:web` (health vía el origen web) en ambos tramos del job `reference` |
| D6-04 | los puertos de `.e2e-ports.json` se reutilizan solo si están libres o los dos servidores responden; el reemplazo del slice deja listar en `@Authenticated` y crear en `@Can` | `5b56f0e0` | `node --experimental-strip-types apps/web/e2e/ports.ts --self-test`, Playwright dos veces seguidas en ambos tramos, y el chequeo del controller de widgets tras `replace-example-slice.mjs` |

## Demo 5 (huecos de esta iteración)

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D5-01 | `truncate-e2e.mjs` trunca las tablas de la app leídas de `information_schema`, sin nombres fijos, y omite `_prisma_migrations` | `bf51460a` | el e2e de API del job `reference` (antes y después del reemplazo del slice) ejecuta el script |
| D5-02 | logout y `me` usan `@Authenticated()`; auth, CSRF, el verificador MCP, health y el seed base no nombran el slice de ejemplo | `dd35cd62` | `node scripts/check-no-note-in-infra.mjs` en el esqueleto y otra vez después de `scripts/replace-example-slice.mjs` |
| D5-03 | la rama se lee con `git symbolic-ref --short HEAD` en bash y PowerShell | `15c5e53b` | `tests/test_mas_nestjs_demo5.py` (repo sin commits) y el paso de CI en bash y PowerShell, que exige salida 128 de `rev-parse --abbrev-ref` |
| D5-04 | `db:migrate` usa `DATABASE_URL`; un string vacío no cae a `SEED_DATABASE_URL`; el seed sigue exigiendo la otra URL | `c969f542` | `tests/test_mas_nestjs_demo5.py` y `prisma migrate deploy` de las dos bases en el job `reference` |
| D5-05 | `/speckit.tasks` copia versiones del lockfile del esqueleto y no pide `npm view` | `9576bfc4` | `tests/test_mas_nestjs_demo5.py` lee el skill, la plantilla de tasks y el checklist |

## Demo 4 (huecos de esta iteración)

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D4-01 | `create-new-feature` deja HEAD en la rama aunque el repo no tenga commits | `7e3a0f2b` | `tests/test_mas_nestjs_gaps.py` (repo vacío y con commit, bash) y el paso de CI «Spec Kit scripts without an LLM» |
| D4-02 | `setup-tasks` escribe `tasks.md` | `7e3a0f2b` | el mismo pytest y el mismo paso de CI |
| D4-03 | `ensure-feature-branch` sale 1 en `main`/`master` y 0 en la rama de feature; los skills lo invocan | `7e3a0f2b` | pytest de bash; paso de CI en bash y PowerShell |
| D4-04 | `prisma.config.ts` usa `datasource.url` y `migrations.seed` | `37f9f929` | `prisma migrate deploy` en el job `reference` y `scripts/compile-preset-snippets.mjs` |
| D4-05 | peers de pnpm 12 van en `pnpm-workspace.yaml` | `37f9f929` | `pnpm install --frozen-lockfile` del job `reference` (el install falla si el mapa no está donde pnpm 12 lo lee) |
| D4-06 | aprobar skills de paquetes con `pnpm approve <pkg>`, no `--all`; conservar `minimumReleaseAgeExclude` | `37f9f929` | el mismo install; el yaml versionado ya trae `permissions` y `minimumReleaseAgeExclude` |
| D4-07 | el seed de e2e usa `SEED_DATABASE_URL` y no la base de `DATABASE_URL` | `37f9f929` | `scripts/ensure-postgres.sh` (exit 1 si son iguales) y `pnpm db:seed` dos veces en CI |
| D4-08 | shadcn no interactivo, sin `src/src` ni `from "cn"` | `37f9f929` | `node scripts/check-shadcn.mjs` dentro de `pnpm verify` |
| D4-09 | el `JwtAuthGuard` global no intercepta MCP; scope insuficiente es error MCP | `37f9f929` | `pnpm test:e2e:mcp` (401 Bearer y 403 `insufficient_scope`) y el unit del guard |
| D4-10 | CASL sin `PureAbility` | `37f9f929` | `tsc` del esqueleto y compilación del snippet |
| D4-11 | `QueryClient` desde `@tanstack/query-core` y `stockFeatures` desde `@tanstack/table-core` | `37f9f929` | `tsc` de `apps/web` y compilación del snippet |
| D4-12 | el checker CASL acepta `permissions.ts` | `7e3a0f2b` | `test_check_casl_accepts_permissions_ts` y `pnpm casl` sobre `permissions.ts` del esqueleto |
| D4-13 | Corepack en Node ≥ 25 sin escribir en `/usr` | `da9e6989` | el job `reference` hace `npm config set prefix ~/.local` antes de Corepack |
| D4-14 | analyze no hace commit; specify/clarify en un repo vacío commitean en la rama | `7e3a0f2b` | el script deja HEAD en la rama (D4-01); el skill lo exige. No hay un commit real de analyze en CI porque esa fase no tiene script |

## Demo 2 y demo 3 reconstruidas del historial

El commit `e2ce8252` agrupó los huecos 2–27 de la demo 2 sin enumerarlos uno a uno. Los commits posteriores cierran la demo 3. Donde el único chequeo histórico es una aserción de texto, queda pendiente.

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D2-01 | `specify init --force` explica qué sobrescribe y no toca `.git` | `81445860` | `test_init_force_explains_git_merge` ejecuta init y lee stdout |
| D2-05 | checker CASL por AST | `384bc74d` | `test_check_casl_tool_shapes` ejecuta el script con Node |
| D2-13 | Tailwind 4 `@source` para `packages/ui` | `460004ab` | Playwright del job `reference` exige fondo no transparente en el botón |
| D2-14 | prohibido reescribir imports compilados; Prisma ESM | `6348a8d7` | `nest build` del job `reference` arranca sin un script `fix-imports` |
| D2-15 | el agente no toma capturas | `edc8da64` | Playwright con `screenshot`/`video`/`trace` en `'off'`; el spec no llama a `page.screenshot` |
| D3-01 | Node es el Active LTS de `index.json` | `e6c1dd69` | el workflow resuelve `index.json` y no tiene una versión fija de Node |
| D3-02 | rama de feature determinista | `799acd05` | D4-01 y D4-03 |
| D3-03 | el warning de Prisma en Node 26 no rompe el install | `3374f355` | `pnpm install` del job `reference` termina 0 con ese warning |
| D3-04 | `allowBuilds` explícito | `72f0916d` | el install de CI construye `prisma`, `argon2` y `@swc/core` |
| D3-05 | Nest corre con SWC y `ThrottlerGuard` va por DI | `b1a3af57` | `pnpm build` y el e2e de 429 |
| D3-06 | cliente MCP declarado y `shadcn add` no interactivo | `67f2ac8b` | `@modelcontextprotocol/client` está en el lockfile; D4-08 |
| D3-07 | no pedir `/speckit.constitution` después del init | `bee9aa95` | pendiente: el chequeo histórico solo mira el texto del comando |
| D3-08 | mínimos de tests de API, MCP, Playwright y unit | `72aa784b` | el job `reference` los ejecuta |
| D3-09 | escenarios de gates | `36537e24` | `tests/test_mas_nestjs_scenarios.py` en el job `smoke` |
| D3-10 | init sin stack falla antes del panel | `4f812998` | pendiente: no hay un pytest que invoque init sin `--stack` y compruebe el código de salida |
| D3-11 | Corepack en el runner de Windows | `ba142825` | el job `smoke` de `windows-latest` instala Corepack |
| D3-12 | ruta nativa en Windows y TypeScript 5.9.3 para check-casl | `e8f3b605` | job `smoke` de Windows; el paquete `@demo/casl-check` depende de `typescript@5.9.3` |

Pendientes de la demo 2 que solo quedaron como frases en `stack-context.md` (locale es-CL del plan, `escapeLike`, `getZodError`, `onUnhandledFrame`, `richColors`, `getAnimations`): el esqueleto cubre es-CL, contraste y axe. El resto no tiene un fallo ejecutable propio y sigue pendiente.

## Versiones probadas

`specify init --stack nestjs-react` copia `pnpm-lock.yaml` y los `package.json` del esqueleto a `.specify/reference/`. Lo comprueba `test_reference_lockfile_is_what_init_installs`. El job `reference` hace `pnpm install --frozen-lockfile` sobre esa copia. Renovate solo actualiza el esqueleto (`renovate.json`); ese PR tiene que pasar este workflow. Así se cumple «última estable» sin resolver versiones en cada proyecto.

## Pre-mortem

| Riesgo | Qué haría fallar la demo | Chequeo |
| --- | --- | --- |
| PM-01 | Postgres recién instalado, sin cluster o sin `postgresql.conf` | `scripts/ensure-postgres.sh` sale 1 y dice cómo correr `initdb`. El job `reference` lo ejecuta contra postgres:16 |
| PM-02 | Corepack sin permiso de escritura en `/usr` | el job `reference` usa `npm config set prefix ~/.local`. El README del esqueleto documenta Linux, macOS, Windows y nvm |
| PM-03 | PATH de nvm vacío | el README indica `source "$NVM_DIR/nvm.sh"` antes de `pnpm` |
| PM-04 | Playwright sin navegadores | `scripts/ensure-playwright.mjs` sale 1 con el comando `pnpm exec playwright install chromium`. El job lo corre después de instalar solo chromium |
| PM-05 | puertos 3000, 4173 o 5432 ocupados | Playwright reserva un puerto libre. La base se elige con las URLs, no asumiendo que 5432 esté libre para la app |
| PM-06 | flujo de scripts sin LLM en un repo vacío | paso de CI en bash (Ubuntu y macOS) y PowerShell (Windows): init, create-new-feature, setup-plan, setup-tasks, ensure-feature-branch en la rama y en `main`, y `finish-feature` (repo nacido vacío, `main` con commits, árbol sucio) |
| PM-07 | migración desde cero, seed dos veces, URLs distintas, truncado | job `reference`: `migrate deploy` de las dos bases, `pnpm db:seed` dos veces, `scripts/truncate-e2e.mjs` en el global setup y en el e2e de API |
| PM-14 | el slice de ejemplo queda acoplado a la infraestructura y el segundo módulo no pasa los gates | el mismo job, paso «Replace the example slice», borra Note, agrega Widget y repite verify, unit, e2e de API, e2e de MCP, Playwright y el build |
| PM-08 | cookies HttpOnly, CSRF rotado en logout, refresh, 429 aislado, MCP con guard JWT | `pnpm test:e2e:api`, `test/throttle.e2e.ts` (instancia propia con límite 2) y `pnpm test:e2e:mcp` |
| PM-09 | es-CL, axe, `routeTree.gen` antes del typecheck, paths `@demo/ui` | `pnpm --filter @demo/web test`, Playwright + axe, `pnpm routes:gen` al inicio de `typecheck` |
| PM-10 | drift de OpenAPI o del api-client, i18n, eslint strict, madge, CASL, tests skipped | `pnpm verify` |
| PM-11 | una dependencia directa prerelease o un lockfile que no instala congelado | `pnpm install --frozen-lockfile` y `node scripts/check-prerelease.mjs`. El checker mira los `package.json` del esqueleto. Rangos transitivos que pnpm anota (`@emnapi/*` beta, `@visx/*` alpha) no son dependencias directas y no rompen el install |
| PM-12 | warnings de engines o peers rompen el install | están documentados en el README del esqueleto; el install de CI no usa `--strict-peer-dependencies` y el warning de Prisma en Node 26 no es un fallo |
| PM-13 | un snippet de la constitution o de un skill no compila (el caso de `prisma.config.ts`) | `scripts/compile-preset-snippets.mjs` contra los `node_modules` del esqueleto |
