# Catálogo de regresiones — `nestjs-react`

Los chequeos de esta tabla se ejecutan. Una búsqueda de texto en la constitution no cuenta como cobertura. «Pendiente» significa que el historial no alcanza para un chequeo ejecutable o que el comportamiento no está en el esqueleto.

## Fidelidad de maquetas

| ID | Descripción | Chequeo |
| --- | --- | --- |
| D9-01 | el logo del prototipo se reemplazó por texto y nadie lo vio porque el e2e solo miraba roles y textos | el job `reference` corre `pnpm test:fidelity` sobre `fixtures/fidelity`: el caso que coincide sale 0; el caso negativo (logo en un `span`, padding 12px, riel 200px) sale distinto de 0 y el mensaje nombra `es texto`, `padding` y `width` |
| D9-02 | se portaron solo tokens de marca y quedaron grises, radios o paddings por defecto del esqueleto | el mismo caso negativo exige `app-header padding 12px vs prototipo 16px` |
| D9-03 | el menú se armó con estilos del esqueleto, sin riel, anchos ni gradiente | el mismo caso negativo exige el ancho del riel (`200px` vs `240px`) |

## Demo 8 (huecos de esta iteración)

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D8-01 | specify, clarify, plan y tasks commitean con `git add -A` y `git commit` en bash y PowerShell; en un repo nacido vacío `finish-feature` deja `main` con el commit de specify como raíz y primer padre del merge | `d1c8800c` | `test_specify_and_clarify_skills_commit` y `test_specify_commit_is_main_root_after_finish` en `tests/test_mas_nestjs_demo8.py`, job `smoke`. El mensaje es Conventional Commits (`docs(spec): specify ...`); lo cubre D22 |
| D8-02 | la constitution, el contexto de stack y el catálogo piden `McpModule.forRoot` con `decorators`, igual que el esqueleto; ningún artefacto generado nombra la variante async de ese registro | `d1c8800c` | `test_mcp_registration_uses_for_root` en `tests/test_mas_nestjs_demo8.py`, job `smoke` |

## Demo 7 (huecos de esta iteración)

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D7-01 | en un repo nacido vacío, `finish-feature` deja `main` en el commit raíz y crea un merge `--no-ff`; si `main` ya existe, lo conserva; un árbol sucio sale 1 | `64fd9ade` | `tests/test_mas_nestjs_demo7.py` y los pasos de CI «Finish feature on Bash» (Ubuntu y macOS) y «Finish feature on PowerShell» (Windows) |

## Demo 6 (huecos de esta iteración)

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D6-01 | `check-casl.ts` acepta `@Authenticated()` en handlers HTTP; una tool MCP sin `@Can` sigue fallando; un handler sin `@Can`, `@Public` ni `@Authenticated` falla | `cbf536d6` | `tests/test_mas_nestjs_demo6.py` y `pnpm casl` del job `reference` |
| D6-02 | `.env.example` lista las variables que la app lee y `specify init` lo copia | `19d2064d` | `tests/test_mas_nestjs_demo6.py` y `node scripts/check-env-example.mjs` |
| D6-03 | Vite hace proxy de `/api` en dev y preview; Playwright llama a la API por el origen de la web | `d8d05593` | `node scripts/check-dev-proxy.mjs` y `pnpm test:e2e:web` (health vía el origen web) en ambos tramos del job `reference` |
| D6-04 | los puertos de `.e2e-ports.json` se reutilizan solo si están libres o los dos servidores responden | `5b56f0e0` | `node --experimental-strip-types apps/web/e2e/ports.ts --self-test` y Playwright dos veces seguidas |

## Demo 5 (huecos de esta iteración)

| ID | Descripción | Commit | Chequeo |
| --- | --- | --- | --- |
| D5-01 | `truncate-e2e.mjs` trunca las tablas de la app leídas de `information_schema`, sin nombres fijos, y omite `_prisma_migrations` | `bf51460a` | el e2e de API del job `reference` ejecuta el script |
| D5-02 | logout y `me` usan `@Authenticated()`; el esqueleto no trae slice, seed ni cuentas de demostración | `dd35cd62` | `node scripts/check-no-example-slice.mjs` |
| D5-03 | la rama se lee con `git symbolic-ref --short HEAD` en bash y PowerShell | `15c5e53b` | `tests/test_mas_nestjs_demo5.py` (repo sin commits) y el paso de CI en bash y PowerShell, que exige salida 128 de `rev-parse --abbrev-ref` |
| D5-04 | `db:migrate` usa `DATABASE_URL`; un string vacío no cae a `SEED_DATABASE_URL`; si `SEED_DATABASE_URL` está definida debe ser distinta | `c969f542` | `tests/test_mas_nestjs_demo5.py` y `prisma migrate deploy` de las dos bases en el job `reference`. El fallback de loopback cuando el seed no está definido es D12-09 |
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
| D3-07 | no pedir `/speckit.constitution` después del init | `bee9aa95` | `test_init_layouts_omit_constitution_step` y `test_upstream_followups_still_list_constitution_when_no_stack` en `tests/test_mas_nestjs_scenarios.py`, job `smoke` |
| D3-08 | mínimos de tests de API, MCP, Playwright y unit | `72aa784b` | el job `reference` los ejecuta |
| D3-09 | escenarios de gates | `36537e24` | `tests/test_mas_nestjs_scenarios.py` en el job `smoke` |
| D3-10 | init sin stack falla antes del panel | `4f812998` | `test_missing_stack_still_fails_before_writing` en `tests/test_mas_nestjs_scenarios.py`, job `smoke` (sale 1 y no escribe el proyecto) |
| D3-11 | Corepack en el runner de Windows | `ba142825` | el job `smoke` de `windows-latest` instala Corepack |
| D3-12 | ruta nativa en Windows y TypeScript 5.9.3 para check-casl | `e8f3b605` | job `smoke` de Windows; el paquete `@demo/casl-check` depende de `typescript@5.9.3` |

Pendientes de la demo 2 que solo quedaron como frases en `stack-context.md` (locale es-CL del plan, `escapeLike`, `getZodError`, `onUnhandledFrame`, `richColors`, `getAnimations`): el esqueleto cubre es-CL, contraste y axe. El resto no tiene un fallo ejecutable propio y sigue pendiente.

## Modularidad estricta

| ID | Descripción | Chequeo |
| --- | --- | --- |
| D10-01 | un dominio no puede importar archivos internos de otro; solo `index.ts` | `apps/api/lint-fixtures/modules/billing/billing.service.ts` (`mas/public-module-api`) dentro de `pnpm lint` |
| D10-02 | Prisma solo en `*.repository.ts` y en el módulo Prisma; `@Global()` solo en config | `service-imports-prisma.ts` (`mas/prisma-only-in-repositories`) y `global-module.ts` (`mas/no-global-module`) |
| D10-03 | archivos de más de 300 líneas o funciones de más de 60 | `long-file.ts` (`max-lines`) y `long-function.ts` (`max-lines-per-function`) |
| D10-04 | `let` o `new Map` en el top-level de una app | `module-state.ts` (`mas/no-module-state`). El rate limit del esqueleto persiste en `rate_limit_buckets` |
| D10-05 | ciclos de módulos | `lint-fixtures/cycle` falla `import-x/no-cycle` y dependency-cruiser `no-circular` |
| D10-06 | el router no importa una feature en estático; el shell no hace `fetch` | `apps/web/lint-fixtures/app-router.tsx` (`mas/lazy-feature-routes`) y `shell/logout.tsx` (`mas/fetch-in-feature-data`) |
| D10-07 | cada módulo y cada feature tienen `index.ts` y el nombre permitido | `modules/orphan/orphan.module.ts` (`mas/module-layout`) |
| D10-08 | un repositorio no toca modelos de otro dominio; el contrato se importa por su index | `billing.repository.ts` (`mas/own-models-only`) e `imports-contract-internal.ts` (`mas/contracts-public-index`) |
| D10-09 | el esquema Prisma es un archivo por dominio y el generador no deja dominios de ejemplo | `node scripts/check-prisma-layout.mjs` en `pnpm verify`, y `node scripts/check-gen-fitness.mjs` al final del job `reference` (genera `alpha` y `beta`, lint, typecheck, test, build, diff acotado, y los borra) |

## Auth del esqueleto

| ID | Descripción | Chequeo |
| --- | --- | --- |
| D11-01 | los contadores de rate limit no pueden hacer count-then-insert; una transacción con `pg_advisory_xact_lock` incrementa, rechaza dentro y purga filas vencidas | `test/throttle.e2e.ts` (20 hits concurrentes, hits 1..20, 15 bloqueados, la fila vencida no sobrevive) en `pnpm test:e2e:api` del job `reference` |
| D11-02 | el login de una cuenta ausente verifica un hash Argon2 ficticio fijo | `auth.service.spec.ts` exige `argon2.verify` con `DUMMY_PASSWORD_HASH` y con el hash real, dentro de `pnpm test` |
| D11-03 | un refresh emitido antes de `password_changed_at` no emite otra sesión | `auth.service.spec.ts` (Unauthorized y `createRefresh` no se llama) |
| D11-04 | un bypass de guard compara el path; una query que contiene `/mcp` no salta la autenticación | `jwt-auth.guard.spec.ts` y el fixture `mcp-bypass.guard.ts` (`mas/no-url-includes-in-guards`) dentro de `pnpm lint` |
| D11-05 | `minimatch` anterior a 11.0.1 no puede quedar en el lockfile | `pnpm audit --audit-level=high` del job `reference` queda en cero; el override `minimatch@<11.0.1` está en `pnpm-workspace.yaml` |
| D11-06 | cada rechazo de login paga el coste Argon2; un 401 que no verifica un hash real verifica antes el Argon2id ficticio fijo (mismos parámetros) | `auth.service.spec.ts` cubre cuenta ausente, contraseña incorrecta, inactiva y bloqueada, dentro de `pnpm test` |
| D11-07 | `BearerVerifier` se instancia dentro del módulo dinámico de MCP y no ve `JwtService` aunque un módulo global reexporte `AuthModule`; la API no arranca (`UnknownDependenciesException`) | `McpModule.forRoot` lleva `imports: [AuthModule]`; el job `skeleton-boot` arranca `node dist/main.js` con `MCP_ENABLED=true` y exige HTTP 200 en `/api/v1/health` |
| D11-08 | con el esquema en `prisma/schema/`, `prisma migrate deploy` imprime `No migration found in prisma/migrations` y sale 0 si `migrations.path` no es absoluto | `apps/api/prisma.config.ts` fija `schema` y `migrations.path` con `import.meta.dirname`; el job `skeleton-boot` falla si la salida contiene `No migration found` |
| D11-09 | `pnpm lint` con el cliente Prisma sin generar reporta cientos de errores de módulo ausente | `pnpm lint` ejecuta `scripts/ensure-prisma-client.mjs` (`prisma generate`) antes de ESLint; el job `skeleton-boot` corre `pnpm lint` tras generate |
| D11-10 | el CI de humo no levantaba la API como proceso ni trataba `No migration found` como fallo, así que un Postgres limpio y el DI de MCP pasaban | el job `skeleton-boot` (Postgres 16) hace generate, `migrate deploy`, seed, arranque real con healthcheck, `pnpm test:e2e:api` y Playwright |
| D11-11 | cambiar el idioma en admin no dejaba fila en la bitácora ni aparecía en Actividad; un handler `@Post`/`@Put`/`@Patch`/`@Delete` sin `@Audit('clave')` del catálogo (o `@NoAudit('motivo')`) no registra actor, persona afectada, tipo, resultado ni timestamp | `apps/api/lint-fixtures/missing-audit.controller.ts` y `unknown-audit.controller.ts` (`mas/require-audit-on-mutations`) dentro de `pnpm lint`; `audit.spec.ts` exige `auth.login` en `activityTypeFilter` y que `language.changed` lance `undeclared audit event` |

## Lint determinista del esqueleto

`pnpm verify` ejecuta `pnpm lint` (el esqueleto en verde) y `pnpm lint:fixtures` (cada fixture tiene que fallar con el mensaje de la corrección). El job `reference` corre `pnpm verify`.

| ID | Descripción | Chequeo |
| --- | --- | --- |
| L2-01 | `apps/api` no importa `apps/web` ni `@demo/ui`; la web no importa la API; `packages/contracts` no importa apps. Los tipos compartidos van a `packages/contracts`. Madge sigue cubriendo ciclos | `apps/api/lint-fixtures/imports-web.ts` (`boundaries/dependencies`) dentro de `pnpm lint:fixtures` |
| L2-02 | un controller o una tool MCP no toca Prisma; la consulta va al servicio de dominio | `apps/api/lint-fixtures/uses-prisma.controller.ts` (`mas/no-prisma-at-edge`) |
| L2-03 | `process.env` y `requiredEnv` solo en `apps/api/src/config` (ConfigModule + Zod), más `prisma.config.ts`, `prisma/database-url.ts`, scripts y configs de e2e (incluido `vite.config.ts`) | `apps/api/lint-fixtures/reads-env.service.ts` (`mas/no-process-env`). El mensaje pide agregar la variable al módulo de config y a `.env.example` |
| L2-04 | `useEffect` solo en `apps/web/src/shared/hooks/**`. El estado de servidor va por TanStack Query | `apps/web/lint-fixtures/route-effect.tsx` (`mas/no-use-effect`). El hook `useWindowEvent` del esqueleto sigue en verde |
| L2-05 | `@ts-ignore` y `@ts-expect-error` exigen descripción (`@typescript-eslint/ban-ts-comment`) | `apps/api/lint-fixtures/bare-ts-ignore.ts` |
| L2-06 | `eslint-disable` exige justificación o ticket (`@eslint-community/eslint-plugin-eslint-comments` `require-description`). Desactivar `no-explicit-any` sigue prohibido aunque haya descripción | `apps/api/lint-fixtures/disable-without-reason.ts` y `disable-explicit-any.ts` |
| L2-07 | un `*.guard.ts` no llama a `originalUrl.includes` ni a `url.includes` | `apps/api/lint-fixtures/mcp-bypass.guard.ts` (`mas/no-url-includes-in-guards`) |

## Subida de archivos

| ID | Descripción | Chequeo |
| --- | --- | --- |
| D13-01 | un DTO transporta el archivo en base64 (`@IsBase64`, `fileContent`) sin tope, o con `@MaxLength` por encima de 1 MiB (`1_048_576`); un servicio hace `Buffer.from(fileContent, "base64")` | `base64-upload.dto.ts` falla `mas/no-base64-file-upload` y `mas/base64-upload-max-length`; `base64-upload-too-big.dto.ts` falla el tope; `base64-buffer.service.ts` falla el `Buffer.from`. Antes de registrar las reglas, el mismo ESLint de fixtures no emitía esos `ruleId`. Con las reglas, `pnpm lint:fixtures` exige el fallo y deja pasar el caso válido: `@MaxLength(1024)` más `eslint-disable-next-line mas/no-base64-file-upload -- motivo`. Un `refreshBase64Url` y `Buffer.from(secret, "base64")` no se marcan |
| D13-02 | `FileInterceptor` / `FilesInterceptor` no declaran `limits.fileSize`, o `AnyFilesInterceptor` limita el tamaño pero el endpoint solo usa `MaxFileSizeValidator` | `upload-no-limit.controller.ts` y `upload-no-type.controller.ts` (`mas/multipart-upload-limits`) dentro de `pnpm lint`. El caso válido ( `limits.fileSize` y `FileTypeValidator`, o `fileFilter`) no dispara la regla. Sin la regla esos fixtures no producían `mas/multipart-upload-limits` |
| D13-03 | un parser casero de un formato estándar: import o `require` de `xlsx` / `xlsx/*`, `inflateRaw` de `node:zlib`, una regex sobre `<sheetData` / `<row` / `<c` / `sheet1.xml`, o un CSV de archivo partido con `.split(',')` / `.split(';')` | `import-xlsx.service.ts`, `zlib-inflate.service.ts`, `sheet-xml.service.ts` y `csv-split.service.ts` (`mas/no-handrolled-format-parsers`) dentro de `pnpm lint:fixtures`. Con la regla en `off` el mismo ESLint no emite ese `ruleId`; con `error` sí. Pasan el lector en streaming de `exceljs`, `csv-parse`, `gzipSync`, un `header.split(',')` y la supresión `eslint-disable-next-line mas/no-handrolled-format-parsers -- motivo`. `scripts/check-prerelease.mjs` rechaza el paquete `xlsx` en un `package.json` o en el lockfile |
| D13-04 | un PDF escrito a mano (`%PDF-`, `obj` / `endobj`, `xref`, `trailer`, `startxref`) en vez de Playwright `page.pdf()`, `pdf-lib` o `unpdf` | `pdf-handrolled.service.ts` (`mas/no-handrolled-format-parsers`, mensaje `pdf-lib`). Con la regla en `off` no emite el `ruleId`; con `error` sí. Los casos válidos importan `pdf-lib`, llaman a `extractText` de `unpdf` y a `page.pdf()` sin disparar la regla |

## Librerías de producto

`pnpm lint:fixtures` enciende cada regla en su severidad y, en un segundo pase, la deja en `off`. En `off` el `ruleId` no aparece. El esqueleto no trae un demo de dashboard ni de subida: axe por ruta, el PDF de impresión, el EXIF y el video viven en la feature. El CI del preset sí compila MJML (`scripts/check-mjml.mjs` dentro de `pnpm lint`).

| ID | Descripción | Chequeo |
| --- | --- | --- |
| D14-01 | un `replace` borra tags HTML | `regex-sanitize.service.ts` (`mas/no-regex-html-sanitize`, error, mensaje `DOMPurify`). En `off` no emite el `ruleId`. Un `replace(/-/g, "")` no se marca |
| D14-02 | `dangerouslySetInnerHTML` recibe HTML crudo | `dangerous-html.tsx` (`mas/no-dangerous-html-unsanitized`, error). En `off` no emite. `DOMPurify.sanitize` no se marca |
| D14-03 | el correo arma `<html` / `<table` / `<body` a mano, o interpola con `{{{` | `email/handmade-mail.ts` y `email/triple-stash.ts` (`mas/no-handmade-email-html`, error, mensaje `mjml2html` o `{{{`). En `off` no emiten. Pasa `mjml2html(..., { validationLevel: "strict" })` y un `{{{` con `eslint-disable` justificado. No se usa react-email |
| D14-04 | `setInterval` o un `setTimeout` de 1000 ms o más en la API | `timer-schedule.service.ts` (`mas/no-timer-scheduling`, warn, mensaje `approved-libraries.md`, sin recomendar BullMQ). En `off` no emite. Un `setTimeout` de 50 ms no se marca. Colas y cron siguen pendientes (BullMQ+Redis o pg-boss); `@nestjs/schedule`, `node-cron` y `agenda` no están en `no-restricted-imports` |
| D14-05 | un gráfico calcula un `<svg>` o llama a `getContext('2d')` | `charts/handmade-chart.tsx` (`mas/no-handmade-charts`, warn, mensaje `Recharts`). En `off` no emite. Un `<path d="M2 2h4v4H2z">` de ícono no se marca |
| D14-06 | `getTime() + 86400000` o `setDate(getDate() + 1)` | `date-math.service.ts` (`mas/no-manual-date-math`, warn, mensaje `date-fns`). En `off` no emite. `addDays` no se marca |
| D14-07 | el tipo del archivo se decide por `originalname` o `mimetype` | `trust-mimetype.controller.ts` (`mas/no-client-file-type-trust`, error, mensaje `file-type`). En `off` no emite. No dispara `mas/multipart-upload-limits`. Con `fileTypeFromBuffer` el MIME puede quedar. El video no pide duración ni ffprobe: peso (`limits.fileSize`) y `file-type` |
| D14-08 | `fetch` a `/v1/chat/completions` | `llm-fetch.service.ts` (`mas/no-direct-llm-fetch`, error). En `off` no emite. Un import del SDK `ai` no se marca |
| D14-09 | `VITE_OPENAI_API_KEY` en `apps/web` | `vite-secret.ts` (`mas/no-secret-in-client`, error). En `off` no emite. `VITE_API_ORIGIN` no se marca |
| D14-10 | `process.env` fuera del módulo de config | `reads-env.service.ts` también falla `mas/no-raw-process-env` (error, mensaje `.env.example`). En `off` no emite ese `ruleId`. La lista blanca sigue siendo `apps/api/src/config`, Prisma, scripts y e2e |
| D14-11 | `console.log` en la API | `console-log.service.ts` (`no-console`, error). En `off` no emite. Un logger al estilo `nestjs-pino` no se marca |
| D14-12 | el login no tiene `@Throttle` ni `SensitiveThrottle` | `login-no-throttle.controller.ts` (`mas/require-throttle-sensitive`, error). En `off` no emite. El esqueleto marca login, refresh, logout y me con `SensitiveThrottle` para no pisar `LOGIN_THROTTLE_LIMIT` |
| D14-13 | `main.ts` no llama a `helmet()` | `api-main.ts` (`mas/require-helmet`, error). En `off` no emite. `apps/api/src/main.ts` del esqueleto sí llama a `helmet()` |
| D14-14 | un formulario guarda el error del campo en `useState` | `form-errors.tsx` (`mas/no-manual-form-errors`, error, mensaje `react-hook-form`). En `off` no emite. `useForm` no se marca |
| D14-15 | `canvas-confetti` sin `prefers-reduced-motion` | `confetti.tsx` (`mas/reduced-motion-animations`, error). En `off` no emite. El caso con `matchMedia` no se marca |
| D14-16 | imports de `moment`, `dayjs`, `chart.js`, `react-chartjs-2`, `echarts`, `socket.io` y `ws`, incluidas subrutas | `banned-imports.ts` (`no-restricted-imports`, error, al menos 13 hallazgos). En `off` no emite. `echarts` con supresión justificada no se marca. No se prohíbe `@nestjs/schedule`, `node-cron` ni `agenda` |
| D14-17 | la plantilla MJML del preset no compila en strict, o la rota sí compila | `scripts/check-mjml.mjs` dentro de `pnpm lint`: `fixtures/email/welcome.mjml` sale HTML; `fixtures/email/broken.mjml` falla con `validationLevel: 'strict'` |
| D14-18 | una imagen de entrada no es PNG o JPG, o la variante no aplica la orientación, no quita el EXIF o no mide el tamaño fijo | `apps/api/src/images/normalize-image.spec.ts` en `pnpm test`: un JPEG con orientación EXIF 6 (rojo a la izquierda, azul a la derecha) se acepta, un WebP se rechaza, y la variante avatar 128 sale en 128×128, sin `orientation` ni `exif`, con los mismos píxeles que `.rotate().resize({ fit: 'cover', position: 'centre' }).jpeg({ quality: 80 })`. El original no se devuelve |

## Modularidad verificable

| ID | Qué no puede volver | Dónde se prueba |
| --- | --- | --- |
| D15-01 | un módulo importa internals de otro (solo el `index` público) | `apps/api/lint-fixtures/depcruise/bad-internal` falla dependency-cruiser `no-foreign-module-internals` dentro de `pnpm lint`. `depcruise/valid` (import del `index.ts`, Prisma solo en el repositorio) pasa |
| D15-02 | un ciclo de módulos | `apps/api/lint-fixtures/depcruise/bad-cycle` falla `no-circular`. El grafo `depcruise/valid` no tiene ciclo |
| D15-03 | un controller importa Prisma (`@prisma/client` o `PrismaService`) | `apps/api/lint-fixtures/depcruise/bad-controller` falla `no-controller-prisma`. En `depcruise/valid` el controller importa el service y el repositorio importa `prisma.service` |
| D15-04 | un controller importa o inyecta un repositorio, hace un bucle, un condicional de negocio o un cálculo | `thin-repository.controller.ts`, `thin-loop.controller.ts`, `thin-branch.controller.ts`, `thin-math.controller.ts` y `thin-prisma.controller.ts` fallan `mas/thin-controllers` dentro de `pnpm lint:fixtures`. Con la regla en `off` no emiten ese `ruleId`. Pasa un controller que delega al service y solo hace `if (!body) throw` |

## Código limpio y contratos

| ID | Qué se rompió | Dónde se prueba |
| --- | --- | --- |
| L3-01 | un texto visible (excepción HTTP o toast) no pasa por i18n | `apps/api/lint-fixtures/hardcoded-message.controller.ts` (`mas/no-hardcoded-user-message`) en `pnpm lint` |
| L3-02 | un formateador fija `'es-CL'` en vez del locale activo | `apps/web/lint-fixtures/fixed-locale.ts` (`mas/no-fixed-locale`) |
| L3-03 | `response.json() as T` no valida el contrato | `apps/web/lint-fixtures/cast-fetch.ts` (`mas/no-cast-fetch-response`) |
| L3-04 | un schema Zod de escritura no termina en `.strict()` | `apps/api/lint-fixtures/loose-write.ts` (`mas/zod-strict-writes`) |
| L3-05 | un `catch` no relanza ni registra; un `catch` que solo relanza el mismo valor tampoco vale | `swallowed-catch.ts` (`mas/no-swallowed-catch`) y `useless-catch.ts` (`no-useless-catch`, ya activa en `eslint:recommended`) |
| L3-06 | el `index.ts` de un módulo exporta el repositorio | `apps/api/lint-fixtures/modules/ledger/index.ts` (`mas/barrel-exports-only-public`) |
| L3-07 | un ciclo entre `*.spec.ts` no lo veía el grafo | `apps/api/lint-fixtures/spec-cycle/` (`no-circular`) dentro de `pnpm lint`; `depcruise apps packages` incluye specs y e2e |
| L3-08 | un tipo de `packages/contracts` se vuelve a declarar en una app | `scripts/check-duplicate-contract-types.mjs` y el fixture rojo `scripts/fixtures/duplicate-types` |
| L3-09 | un export, archivo o dependencia muerta entra al esqueleto | `knip` dentro de `pnpm lint` (job `reference` y `skeleton-boot`) |

## Migraciones seguras sobre datos existentes

`pnpm lint` corre `scripts/lint-migrations.mjs` (las migraciones del esqueleto, sin base de datos) y `scripts/check-migration-fixtures.mjs` (cada fixture negativo sale distinto de 0 con su código). El job `skeleton-boot` aplica el script sobre Postgres.

| ID | Descripción | Chequeo |
| --- | --- | --- |
| D12-01 | `ADD COLUMN ... NOT NULL` sin `DEFAULT` sobre una tabla que ya existe | fixture `add-not-null` (`not-null-add`) dentro de `pnpm lint` |
| D12-02 | `UPDATE` asigna NULL antes de quitar `NOT NULL` (el caso P3018 / 23502) | fixture `null-into-not-null` y `node scripts/upgrade-on-data.mjs --prove-reject` en `skeleton-boot` |
| D12-03 | `SET NOT NULL` sin un `UPDATE` previo que asigne un valor no nulo | fixture `set-not-null` (`not-null-set`) |
| D12-04 | `DROP COLUMN` o `DROP TABLE` sin `-- mas:allow-destructive <motivo>` | fixtures `drop-column` y `drop-table` (`destructive`) |
| D12-05 | renombre de columna sin esa marca | fixture `rename-column` (`destructive`) |
| D12-06 | índice único nuevo sobre una tabla que ya estaba en una migración anterior | fixture `unique-existing` (`unique-on-existing`) |
| D12-07 | se edita el SQL de una migración que ya está en la rama base | fixture `edited` (`edited-migration`). El lint real compara con `origin/master`, `origin/main` o `MIGRATION_BASE_REF` |
| D12-08 | el caso seguro pasa: `DEFAULT`, backfill y luego `SET NOT NULL`, y `DROP COLUMN` con la marca | fixture `pass` (el script exige cero hallazgos) |
| D12-09 | sin `SEED_DATABASE_URL`, `db:seed` usa `DATABASE_URL` solo en `127.0.0.1`, `localhost` o `::1`; un host remoto se niega; con la variable definida sigue siendo distinta | `test_migration_url_ignores_blank_and_seed` en `tests/test_mas_nestjs_demo5.py` |
| D12-10 | el deploy de un PR no asume una base vacía: migraciones de la base, seed, luego `migrate deploy` | `skeleton-boot` ejecuta `upgrade-on-data.mjs --split-last`. Los proyectos copian `.github/workflows/upgrade-on-data.yml` del esqueleto |
| D12-11 | el texto del admin quedó blanco: `.rail-link[aria-current=page]` y el hover usaban `--sidebar-accent-foreground`, heredada del tema oscuro, y el chequeo leía la variable en `:root` en vez del color computado | `e2e/fidelity.ts --self-test` exige que prototipo y caso negativo compartan `--sidebar-accent-foreground: #ffffff` en `:root` mientras el enlace del prototipo fija `#123456`. El job `reference` corre `pnpm test:fidelity`: el caso que coincide sale 0 y registra el color computado; el caso negativo sale distinto de 0, nombra `hover color` y `axe color-contrast`. Leer `:root` no habría fallado |
| D12-12 | la maqueta usa Font Awesome (`fa-solid fa-gauge`) y la implementación importó otra librería | el mismo caso negativo nombra `icon lucide:gauge vs prototipo fontawesome:fa-solid fa-gauge`. `pnpm lint` falla `mas/icon-library` en `icons/wrong-library.tsx` (react-icons) y en `icons/direct-library.tsx` (lucide-react fuera del módulo central). El módulo `apps/web/src/icons/index.ts` sí puede importar la librería de `ui.icons.json` |
| D12-13 | `useApplyLocale` llamaba a `i18n.changeLanguage` durante el render y en cada pasada volvía a imponer el idioma del navegador sobre la cookie: loop infinito y selector pegado | `pnpm lint` falla `mas/no-i18n-mutation-in-render` en `apps/web/lint-fixtures/i18n/change-in-render.tsx` (mensaje `during render`) y en `effect-without-guard.tsx` (mensaje `needs a guard`). El caso válido (handler y efecto con `if (i18n.language !== next)`) no dispara la regla. `apps/web/src/i18n/locale.spec.ts` exige preferencia, luego cookie, luego navegador, luego el default, y que el navegador no pise la cookie |
| D12-14 | el menú de administración no cambiaba de idioma: `t()` al cargar el módulo, o un array de navegación con el texto ya resuelto | `pnpm lint` falla `mas/no-module-translation` en `i18n/module-t.ts` (`module scope`) y en `i18n/nav-literal.ts` (`labelKey`). El caso válido guarda `labelKey` y llama a `t()` dentro del componente. `mas/no-literal-copy` falla `i18n/jsx-literal.tsx` (`locales/*.json`) en texto JSX y en `aria-label` |
| D12-15 | las cards de configuración no seguían la maqueta (faltaba `panel-card`, `section-label`, `h5`, texto muted, `hr.my-4`, fila con label, badge, ayuda y switch; el mapa no pedía borde, radio, sombra, padding, tipografía ni color computado) | `node scripts/check-settings-card.mjs` dentro de `pnpm lint`: `missing-hr` sale distinto de 0 y nombra `<hr`; `map-gap` nombra `box-shadow`; `literal-color` nombra `literal color`; `pass` sale 0 |

## Clean code y quality gates (v1.4.3-mas.3)

| ID | Qué se rompió | Dónde se prueba |
| --- | --- | --- |
| D16-01 | una función con más de 3 parámetros (F1). Un constructor NestJS con 5 dependencias no cuenta | `too-many-params.ts` (`mas/max-callable-params`, mensaje `F1`) dentro de `pnpm lint:fixtures`. Con la regla en `off` no emite el `ruleId`. El caso válido es el constructor de `AuthService` |
| D16-02 | código comentado (C5) o un número mágico distinto de -1, 0, 1 y de un código HTTP (G25) | `commented-code.ts` (`mas/no-commented-code`, warn, mensaje `C5`) y `magic-number.ts` (`no-magic-numbers`, warn). En `off` no emiten. `0`, `1` y `-1` no se marcan. Los tests tienen la regla apagada |
| D16-03 | dos funciones iguales, o un clon por encima del trinquete de jscpd (G5) | `identical-functions.ts` (`sonarjs/no-identical-functions`). En `off` no emite. `check-quality-baseline.mjs --self-test` exige clones con el umbral bajo y cero clones con el umbral alto |
| D16-04 | un service llama a `Date.now()`, `new Date()` sin argumento, `Math.random()` o `new HttpClient()` | `hidden-deps.service.ts` (`mas/no-hidden-service-deps`, mensaje `Clock`). En `off` no emite. El esqueleto inyecta `SystemClock` y `SystemIdGenerator`. `modules/platform` es el único lugar que llama a `Date.now()` |
| D16-05 | una línea nueva trae un warning de adopción y el árbol viejo no | `scripts/check-diff-quality.mjs --self-test`: el warning en la línea agregada falla; el mismo warning fuera del diff pasa; otra regla no entra |
| D16-06 | el trinquete deja subir un warning, un hallazgo de knip o un clon | `check-quality-baseline.mjs --self-test` falla si el conteo sube y pasa si queda igual o baja. `pnpm lint` compara `quality-baseline.json`. Los clones de jscpd que tocan un archivo sin seguimiento no cuentan: `check-gen-fitness` genera dos dominios iguales antes de `git add` y no debe subir el trinquete |
| D16-07 | el diff cubre menos del 80 % de líneas o ramas nuevas. Con el umbral en 0 el mismo lcov pasa | `scripts/check-diff-coverage.mjs --self-test` |
| D16-08 | un componente con 3 o más condicionales no tiene `*.test.tsx` | `check-component-tests.mjs --self-test`: umbral 99 (apagado) acepta el panel; umbral 3 lo rechaza; el directorio `covered` pasa |
| D16-09 | un secreto de ejemplo no se detecta, o se detecta con la regla apagada | `check-gitleaks-fixture.mjs` (mensaje `generic-api-key`). El job de CI corre gitleaks 8.24.3 sobre el esqueleto con `.gitleaks.toml` |
| D16-10 | `/speckit.converge` no existía y el loop no estaba escrito para el agente que corrige bugs | el preset registra `commands/speckit.converge.md` y `docs/quality-loop.md`. El skill cita la licencia MIT en `NOTICE` |
| D16-11 | Playwright carga `choosePorts` en paralelo y cada worker se queda con un puerto distinto; el e2e web recibe `ERR_CONNECTION_REFUSED` | `apps/web/e2e/ports.ts --self-test`: dos llamadas en paralelo con `isLocked: false` divergen; con el candado (`mkdir` de `${file}.lock`) devuelven el mismo par |
| D16-12 | `check-gen-fitness` genera alpha y beta, dos copias del mismo andamio, y el trinquete de jscpd sube | `check-gen-fitness` corre `pnpm lint -- --skip-jscpd-ratchet`. `check-quality-baseline.mjs --self-test` exige que un clon real (conteo 0 → clones encontrados) falle el trinquete y que el mismo conteo no falle cuando el flag está presente |
| D16-13 | `--skip-jscpd-ratchet` queda activo en `pnpm verify` o en el `lint` del CI | `check-quality-baseline.mjs --self-test` lee `package.json`: `verify` y `lint` no contienen el flag; el script de fitness sí lo pasa. Sin argumentos, `skipsJscpd` es falso |

## Preset al sincronizar un producto (v1.4.3-mas.3.1)

| ID | Qué se rompió | Dónde se prueba |
| --- | --- | --- |
| D17-01 | el diff de calidad comparaba contra `HEAD` y ESLint arrancaba con `overrideConfigFile: true`, así que un checkout limpio de CI no veía el PR ni las reglas del proyecto | `tests/test_mas_nestjs_d17.py`: `--print-base` imprime el merge-base de `GITHUB_BASE_REF`. El script no usa `overrideConfigFile`. `.github/workflows/diff-quality.yml` hace `fetch-depth: 0` |
| D17-02 | sin `--lcov` y `--diff` el gate de cobertura salía 0, y `pnpm lint` solo corría el self-test | el mismo test: el script sin flags sale distinto de 0; `pnpm verify` contiene `--gate` y `pnpm lint` solo `--self-test` |
| D17-03 | el gate de componentes exigía `apps/web/src/shell` | `check-component-tests.mjs --self-test` imprime `no-shell ok` (fixture sin esa carpeta, y `quality-gates.json` que apunta a `panels`) |
| D17-04 | el self-test del trinquete leía `scripts/check-gen-fitness.mjs` | `check-quality-baseline.mjs --self-test` acepta un temporal llamado `check-module-fitness.mjs` vía `jscpdSkipScripts` |
| D17-05 | dependency-cruiser no resolvía `exports`, y knip no tenía ignores de producto | `.dependency-cruiser.cjs` tiene `enhancedResolveOptions`. `knip.product.json` existe y `run-knip.mjs` lo fusiona |
| D17-06 | `mas/no-hidden-service-deps` estaba en error y rompía `Date.now()` / `new Date()` ya presentes | `eslint.config.js` lo deja en `warn`. `ADOPTION_RULES` lo incluye. El self-test de `check-diff-quality.mjs` falla si esa regla aparece en una línea nueva |
| D17-07 | el esqueleto no traía `AGENTS.md`, o un puntero nombraba un archivo que no existe | `scripts/check-agents-md.mjs --self-test`: falta un archivo, falla; un link a `no-such.md` falla; un `{{placeholder}}` y un archivo real pasan. `pnpm verify` corre el chequeo sobre los cuatro archivos |

## Gates de la v1.4.3-mas.4

| ID | Qué se rompió | Dónde se prueba |
| --- | --- | --- |
| D18-01 | la mutación corría el árbol entero o no tenía umbral | `scripts/check-mutation.mjs --self-test`: un archivo fuera de nómina, permisos y auth no entra; `auth.service.ts` sí; sin `threshold` el gate sale distinto de 0 |
| D18-02 | un `index.ts` nuevo o tocado cambiaba exports sin snapshot ni motivo | `scripts/check-public-api.mjs --self-test`: sin snapshot es error; con diff y sin `JUSTIFICATION.md` es error; con el motivo pasa. Lo que no está en el diff solo avisa |
| D18-03 | un archivo nuevo pasaba de 300 líneas, o faltaba el tope del bundle | `scripts/check-size-budget.mjs --self-test`: lo viejo avisa; lo nuevo en el diff es error. `.size-limit.json` nombra `web initial` |
| D18-04 | la respuesta traía un campo que el contrato no nombra | `scripts/check-api-contract.mjs --self-test`: el campo extra es error; un campo viejo ausente avisa |
| D18-05 | el CI no corría audit ni Semgrep | `.github/workflows/security.yml` contiene `pnpm audit` y `semgrep` |
| D18-06 | la misma regla quedaba activa en ESLint y en oxlint, o al apagarla bajaba el trinquete | `scripts/check-oxlint-split.mjs --self-test` imprime `counts-equal`. El plugin va al final. El trinquete y el diff definen `HARNESS_ESLINT_FULL`. Un `oxlint-disable` solo es `hueco` |
| D18-07 | verify no dejaba rastro del gate | `scripts/harness-telemetry.mjs --self-test` escribe una línea JSON sin secretos. El workflow de reference sube el artefacto `harness-telemetry` |
| D18-08 | una feature no tenía ningún E2E `@critical` | `scripts/check-critical-e2e.mjs --self-test`. El job `e2e-critical` es bloqueante. La protección de ramas la configura Manuel |
| D18-09 | un test fuera de la fidelidad visual tomaba una captura | `scripts/check-visual-policy.mjs --self-test`. El job `visual` tiene `timeout-minutes: 2` y bloquea: en CI entró en 25 s |

## Gate de mutación (v1.4.3-mas.4.1)

| ID | Qué se rompió | Dónde se prueba |
| --- | --- | --- |
| D19-01 | en CI, con el árbol limpio, el diff contra el working tree salía vacío y el gate se saltaba; además faltaba `@stryker-mutator/vitest-runner` | `tests/test_mas_nestjs_d19.py`: en un repo con dos commits el archivo entra al plan y no se imprime «sin diff». `scripts/check-mutation.mjs --self-test` cae a `origin/HEAD` (no a `testing`) y resuelve el runner 10.1.1 cuando `node_modules` está instalado |
| D19-02 | `.gitleaks.toml` solo traía allowlist y `--config` en gitleaks 8.24 reemplazaba las reglas por defecto, así que un `aws_secret_access_key` falso pasaba | `tests/test_mas_nestjs_d19.py`: gitleaks 8.24.3 sobre un commit con un access key y un `aws_secret_access_key` de 40 caracteres que no son los de la documentación. Con el toml de la base sale 0 (`no leaks found`); con el de HEAD sale distinto de 0 (`leaks found: 2`). Si el binario no está, solo un runner que no es Linux hace skip |
| D19-03 | `check-public-api` usaba `git diff HEAD`, y un export ya commiteado sin `JUSTIFICATION.md` solo avisaba | el mismo test, con el árbol limpio: el script sale distinto de 0 y nombra «sin justificación» |
| D19-04 | el tope de líneas y el presupuesto de módulo usaban `git diff HEAD`; un archivo nuevo ya commiteado no era error y un módulo por encima de 4000 líneas solo avisaba | el mismo test, con el diff commiteado y el árbol limpio: hay error por `new.ts` y por el módulo `auth` |
| D19-05 | un archivo nuevo de `apps/api/src` ausente del lcov dejaba el ratio de cobertura en 1 | el mismo test: el diff commiteado de `apps/api/src/miss.ts`, con un lcov que no lo nombra, deja `ok` en falso y `lineTotal` ≥ 1 |
| D19-06 | el gate de tamaño solo comprobaba que existiera `.size-limit.json` y un `apps/web/dist/assets/index.js` de 800 kB pasaba, mientras `size-limit` salía 1 | el mismo test: con `dist` presente, `check-size-budget.mjs` ejecuta size-limit 14.3.0 y sale distinto de 0. El job que hace `pnpm build` vuelve a correr el gate |
| D19-07 | en el proyecto generado el CI corría el gate antes de que existiera `apps/web/dist` y, sin ese directorio, salía 0 | el mismo test: con `CI=true` y sin `dist` el gate sale distinto de 0. El YAML de `.github/workflows/diff-quality.yml` tiene un paso `pnpm build` y, después, `check-size-budget.mjs` |
| D19-08 | `pnpm verify` corría Stryker (`check-mutation.mjs --run`) y un proyecto real tardaba 23 minutos | `tests/test_mas_nestjs_d19.py`: el YAML de `diff-quality.yml` declara el job `mutation`, corre `check-mutation.mjs --run` sin `continue-on-error` y el workflow es `pull_request` (el fallo del job falla el check). El script `verify` de `package.json` ya no contiene `--run`. Falla en `9b597375` y en `381b9c49`; pasa en HEAD |
| D19-09 | un `git diff` fallido o un repo sin base salía 0 con «sin archivos mutables»; los workflows del esqueleto no declaraban `permissions`; el incremental de Stryker 10.1.1 reutiliza resultados si no hay cobertura perTest y la clave de caché no cambia con el código | `tests/test_mas_nestjs_d19.py`: un git que falla solo en `diff` sale 1 e imprime el stderr; un único commit sin base sale 1 y no imprime «sin archivos mutables». `diffNames` ya no devuelve `[]` si git falla. Cada workflow de `reference/.github/workflows` tiene `permissions.contents: read`. La clave de `actions/cache` incluye `apps/api/src/**/*.ts`. Un reporte sin `coveredBy` en mutantes Killed hace que el script descarte el incremental y, si la segunda corrida sigue sin cobertura, salga 1. Falla en `1c0b7f24`; pasa en HEAD |
| D19-10 | un archivo mutable con solo mutantes `Ignored` o `NoCoverage` dejaba el score en NaN y Stryker salía 0; `coveredBy: []` contaba como cobertura | `tests/test_mas_nestjs_d19.py`: si no hay mutantes puntuados el score no es finito y `check-mutation.mjs --run` sale 1. Un `Killed` con `coveredBy` vacío no pasa `perTestCoverageOk`. Un score 50 con Stryker en 0 sale 1 porque está por debajo de 80. `gitDiffFailureText` incluye `error.message` (ENOBUFS). Falla en `a4ea5c5b`; pasa en HEAD |

## Conventional Commits (v1.4.4-mas.2)

| ID | Qué se rompió | Dónde se prueba |
| --- | --- | --- |
| D22-01 | ningún stack exigía Conventional Commits 1.0.0 en la constitución | `tests/test_mas_conventional_commits.py`: tras `specify init --stack` de los seis stacks, `constitution.md` tiene el principio XI y la URL `https://www.conventionalcommits.org/en/v1.0.0/`. Falla en `fd079188`; pasa en esta rama |
| D22-02 | specify, clarify, plan y tasks commiteaban `speckit.<fase>` | el mismo archivo: el `git commit -m` de cada skill cumple el formato y no queda `-m "speckit.` |
| D22-03 | no había validador ni plantilla de CI | el mismo archivo: existen `check-commit-msg.sh`, `check-commit-msg.ps1` y `.specify/templates/ci/conventional-commits.yml` con `permissions: contents: read` |
| D22-04 | un mensaje inválido podía commitearse | el mismo archivo: bash y PowerShell aceptan `feat: x`, `fix(api)!: x`, un pie `BREAKING CHANGE:`, `Merge 001-x` y `Revert "..."`; rechazan `speckit.specify`, `[Spec Kit] Add specification`, `Feat: x`, un tipo desconocido y una descripción vacía |
| D22-05 | no había hook `commit-msg` | el mismo archivo, en un repo temporal con `core.hooksPath .githooks`: un commit inválido sale distinto de 0 y uno válido sale 0 |
| D22-06 | el esqueleto nestjs-react no tenía commitlint ni un job de commits | el mismo archivo: pins exactos `@commitlint/cli` y `@commitlint/config-conventional` `21.2.4`, `commitlint.config.mjs`, `.githooks/commit-msg`, job `commits` con `permissions: contents: read`, y `commitlint --edit` sale distinto de 0 con un mensaje inválido |
| D22-07 | la extensión git, instalada con `--stack`, dejaba `commit_style: fixed` y un mensaje inicial `[Spec Kit]` | el mismo archivo: `commit_style: conventional` e `init_commit_message: "chore: initial commit"` |
| D22-08 | `.specify/memory/` no repetía la regla en cada stack | el mismo archivo: `stack-context.md` de los seis stacks incluye la URL de Conventional Commits 1.0.0 |
| D22-09 | `integration switch --refresh-shared-infra` no reescribía `check-commit-msg.sh` ni `.ps1`, así que un stub editado sobrevivía | el mismo archivo: tras init con stack, el manifiesto compartido registra el validador y el refresh deja los mismos bytes que el init |
| D22-10 | con `.specify/extensions` como enlace, init con `--extension git` salía 0 y dejaba `commit_style: fixed` | el mismo archivo: ese init deja `commit_style: conventional` y `init_commit_message: "chore: initial commit"`; otro `FileHelperError` sigue propagándose |

## Higiene y código limpio (v1.4.4-mas.3)

| ID | Qué se rompió | Dónde se prueba |
| --- | --- | --- |
| D23-01 | la constitución no tenía los principios XII y XIII | `tests/test_mas_hygiene.py`: tras init, `constitution.md` está en 1.2.0, nombra ambos principios y dice «recomendado; aplica criterio» |
| D23-02 | no había plantilla de PR ni job `pr-hygiene` | el mismo archivo: `.github/pull_request_template.md` es una plantilla recomendada con las cinco secciones. La plantilla de CI tiene `contents: read`, el evento `edited` y no llama a `check-commit-msg` |
| D23-03 | el cuerpo no distinguía aviso de evidencia | el mismo archivo: sin otro hallazgo, un cuerpo incompleto sale 0 con `INFORMA`. Con `--evidence` (cambio grande sin tests, auth, upgrade o revert) faltan **Cómo se validó** o **Riesgos/rollback** y sale distinto de 0. `pr-hygiene.yml` pasa `--evidence` en esos casos |
| D23-04 | el ajuste de cuerpo no debía cambiar Conventional Commits | el mismo archivo: `check-commit-msg.sh` sigue aceptando `Merge 001-x` y `conventional-commits.yml` no usa `--title`. Un título `Update` solo informa |
| D23-05 | la lista genérica (`fix`, `cambios`, `update`) bloqueaba o no avisaba | el mismo archivo: `feat: update` y `feat(api): Update` salen 0 con `INFORMA`. `fix: add login form` sale 0 sin aviso. `Update` sigue distinto de 0 porque no es Conventional Commits |
| D23-06 | `.DS_Store`, logs y certificados se podían agregar | el mismo archivo: `check-junk-files` sale 1; un fixture `.pem` no |
| D23-07 | el presupuesto de líneas contaba vendor y no distinguía aviso de bloqueo | el mismo archivo: `vendor/` no suma; h4_mode warn no bloquea 1600 líneas; h4_mode block sí, salvo `pr-grande-justificado` |
| D23-08 | más de 300 líneas sin tests no se medían | el mismo archivo: harness sale 1; legacy sale 0 con `INFORMA` |
| D23-09 | un feature podía ir directo a master | el mismo archivo: `feature` hacia `master` sale 1; `testing` y `hotfix/login` salen 0 |
| D23-10 | `dd(` y `console.log` en líneas nuevas no se veían | el mismo archivo: el diff con debug sale 1 |
| D23-11 | un diff vacío no informaba | el mismo archivo: numstat vacío sale 0 con `INFORMA` |
| D23-12 | no había Semgrep MAS ni `security.yml` con baseline | el mismo archivo: las reglas `mas-user-id-permission` y `mas-cake-auth-allow` existen y el workflow usa `--baseline-commit` |
| D23-13 | `hygiene.yml` no cambiaba por stack | el mismo archivo: cake ignora `webroot/files/`, moodle3 ignora `public_html/lib/`, nest usa `main` y `clean_code_mode: block` |
| D23-14 | no había hook `pre-commit` de basura | el mismo archivo: el hook generado llama a `check-junk-files.sh` |
| D23-15 | no había skill PHP de código limpio | el mismo archivo: los cinco stacks PHP tienen `skills/clean-code-php/SKILL.md` y el skill TypeScript de nest no cambia de hash |
| D23-16 | el código limpio bloqueaba legacy o ignoraba el baseline | el mismo archivo: modo `info` sale 0; modo `block` sale 1 solo si el hallazgo no está en el baseline |
| D23-17 | PHP no tenía ruleset PHPMD ni el front de laravel sonarjs | el mismo archivo: `phpmd.xml` trae CyclomaticComplexity y el eslint de laravel trae `sonarjs/cognitive-complexity` |
| D23-18 | un entrypoint Moodle nuevo no exigía login | el mismo archivo: un PHP sin `require_login` sale 1; con la llamada sale 0 |
| D23-19 | nestjs-react no tenía plantilla de PR, denylist ni CODEOWNERS | el mismo archivo: el reference tiene la plantilla, `.DS_Store` en `.gitignore` y CODEOWNERS de `auth`. `check-commits.mjs` no gana un rechazo nuevo de `Merge ` |
| D23-20 | `stack-context.md` no repetía XII ni XIII | el mismo archivo: los seis contextos nombran el principio XIII y `check-hygiene.sh` |

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
| PM-14 | el esqueleto no incluye un slice de ejemplo | el job de referencia ejecuta `node scripts/check-no-example-slice.mjs` y falla si reaparece un módulo o una cuenta de demostración |
| PM-08 | cookies HttpOnly, CSRF rotado en logout, refresh, 429 aislado, MCP con guard JWT | `pnpm test:e2e:api`, `test/throttle.e2e.ts` (instancia propia con límite 2) y `pnpm test:e2e:mcp` |
| PM-09 | es-CL, axe, `routeTree.gen` antes del typecheck, paths `@demo/ui` | `pnpm --filter @demo/web test`, Playwright + axe, `pnpm routes:gen` al inicio de `typecheck` |
| PM-10 | drift de OpenAPI o del api-client, i18n, eslint strict, madge, CASL, tests skipped | `pnpm verify` |
| PM-11 | una dependencia directa prerelease o un lockfile que no instala congelado | `pnpm install --frozen-lockfile` y `node scripts/check-prerelease.mjs`. El checker mira los `package.json` del esqueleto. Rangos transitivos que pnpm anota (`@emnapi/*` beta, `@visx/*` alpha) no son dependencias directas y no rompen el install. `auditConfig.ignoreGhsas` omite `GHSA-fc5q-39xc-vjpf`: picomatch 4.0.7 es la última estable y el aviso no tiene versión parcheada; entra por shadcn y fast-glob |
| PM-12 | warnings de engines o peers rompen el install | están documentados en el README del esqueleto; el install de CI no usa `--strict-peer-dependencies` y el warning de Prisma en Node 26 no es un fallo |
| PM-13 | un snippet de la constitution o de un skill no compila (el caso de `prisma.config.ts`) | `scripts/compile-preset-snippets.mjs` contra los `node_modules` del esqueleto |
