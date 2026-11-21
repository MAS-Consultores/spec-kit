
## NestJS + React Stack Constitution

The following stack-specific principles are constitution-level requirements for all NestJS + React projects. See `stack.md` and `stack-context.md` for implementation details.

### Strict TypeScript

TypeScript strict mode with ZERO `any` tolerance:
- MUST NOT use `: any`, `as any`, or `<any>` anywhere in source code
- ESLint MUST use `typescript-eslint/strictTypeChecked` with `@typescript-eslint/no-explicit-any: 'error'`
- MUST NOT disable, set to warn, or use `eslint-disable` to bypass no-explicit-any, even with a justification
- Flat config is `eslint.config.js` (not `.eslintrc.cjs`), with `eslint-plugin-boundaries`. `apps/api` and `apps/web` MUST NOT import each other. `apps/api` MUST NOT import `@demo/ui`. `packages/contracts` MUST NOT import an app. Shared types and schemas go in `packages/contracts`. Cycles stay on `madge`
- Controllers (`*.controller.ts`) and MCP tools (`apps/api/src/mcp/**`) MUST NOT touch Prisma (`PrismaClient`, `@prisma/client`, the generated client, or `PrismaService`). The query belongs in the domain service
- `process.env` and `requiredEnv` MUST be read only in `apps/api/src/config` (Nest `ConfigService` backed by Zod validation). Validation runs when the app is created (`NestFactory.create`), not at import, so tests can set variables in `beforeAll`. Do not call `@nestjs/config`'s `ConfigModule.forRoot` at module-evaluation time: that version reads the environment immediately. Add the variable to the config module and `.env.example`, then inject `ConfigService`. Also allowed: `prisma.config.ts`, `prisma/database-url.ts`, `scripts/**`, and e2e configs (`*.e2e.ts`, `e2e/**`, `playwright.config.ts`, `vitest.e2e.ts`, `vite.config.ts` for `API_PROXY_TARGET`)
- `useEffect` is forbidden in product code. It is allowed only in `apps/web/src/shared/hooks/**`. Server state goes through TanStack Query
- `eslint-disable` MUST include a justification or ticket after `--`. `@ts-ignore` and `@ts-expect-error` MUST include a description (`@typescript-eslint/ban-ts-comment`, `minimumDescriptionLength`). `@eslint-community/eslint-plugin-eslint-comments` enforces `require-description` and forbids disabling `no-explicit-any`
- ESLint ignores generated files (`routeTree.gen.ts`, `generated/prisma/**`). `routeTree.gen.ts` MUST still be committed so `tsc --noEmit` works on a clean clone
- `tsconfig.json` includes sources and tests for the editor and `projectService`; `tsconfig.build.json` includes only `src` for `nest build`
- API dev, e2e, and OpenAPI MUST run on the SWC build: `nest-cli.json` `builder: "swc"` and `typeCheck: true`; `dev` is `nest start --watch`; `start:e2e` is `nest build && node dist/main.js`; `openapi:generate` sets `OPENAPI_GENERATE=1` before importing compiled `main`. `tsx src/main.ts` is forbidden for the Nest process
- `@demo/contracts` (and any internal TypeScript package imported with `.js` specifiers) MUST ship compiled `exports`. `packages/ui` stays source-only
- `ThrottlerGuard` MUST be registered as `{ provide: APP_GUARD, useClass: ThrottlerGuard }` in a module that imports `ThrottlerModule`. Do not construct it with `new` (`Reflector` stays undefined under SWC)

### Latest Stable Versions

Always use the latest stable release, never prereleases:
- MUST respect minimum major versions: @nestjs/core 12, prisma 7, zod 4, react 19, @casl/ability 7, @tanstack/react-table 9
- MUST NOT downgrade to resolve peer dependency warnings
- A new project MUST copy `package.json` files and `pnpm-lock.yaml` from `.specify/reference/` (installed by `specify init --stack nestjs-react`). Those are the versions that passed CI. Do not resolve versions at generation time and do not run `npm view` to pick them
- `npm view` is only for the Renovate pull request that updates the skeleton in this preset. That PR is the only place versions move, and it must pass the NestJS React smoke workflow before merge
- MUST reject prereleases; the lockfile is the proof the set is stable
- TypeScript MAY be pinned below absolute latest when `typescript-eslint`'s peer range requires it: use the highest stable TypeScript that satisfies that peer, and document the exception
- `scripts/check-casl.ts` is a separate pin: it MUST run on the latest TypeScript 5.x stable (`typescript@5`, exact `5.9.3` as of 2026-11-13). TypeScript 7's package root no longer exports `createSourceFile`, so the AST walk cannot load `typescript@7`. This is not a prerelease and it does not lower the application's TypeScript. Revisit the pin when a stable TypeScript release exports an equivalent parser API; until then do not point the script at TypeScript 7
- `prisma` and `@prisma/client` MUST be the same exact Prisma 7.x stable version
- `pnpm-workspace.yaml` MUST list `allowBuilds` explicitly (`true` for `prisma`, `@prisma/engines`, `argon2`, `esbuild`, `@swc/core`, `msw`; `false` for `@scarf/scarf`). A later package whose install script is not listed fails pnpm 12: add that name in the same change, `true` only when the script is required, never via `pnpm approve-builds --all`
- pnpm 12 ignores `package.json#pnpm.peerDependencyRules`. Peer exceptions live in `pnpm-workspace.yaml` under `peerDependencyRules.allowedVersions`
- pnpm 12 writes `minimumReleaseAgeExclude` into `pnpm-workspace.yaml` for packages newer than the release-age gate and prints `Agent skills awaiting approval` for packages that ship skills (for example `@tanstack/react-table` and `@tanstack/table-core`). Approve those named packages only: `pnpm approve @tanstack/react-table @tanstack/table-core --yes`, which sets `permissions.<name>.skills: true`. Do not run `pnpm approve --all` or `pnpm approve-builds --all`
- `pnpm db:migrate` and `prisma migrate deploy` MUST use `DATABASE_URL`. `prisma.config.ts` reads only that variable. A missing value and a string of spaces are unset: they do not fall through to `SEED_DATABASE_URL`. When `SEED_DATABASE_URL` is set, `pnpm db:seed` MUST use it and it MUST differ from `DATABASE_URL`. A blank `SEED_DATABASE_URL` is unset. In that case `pnpm db:setup` and `pnpm db:seed` migrate and seed `DATABASE_URL` only when its host is `127.0.0.1`, `localhost`, or `::1`. Any other host is refused. CI and e2e keep a separate `SEED_DATABASE_URL`. Migrate the e2e database with `DATABASE_URL="$SEED_DATABASE_URL" pnpm --filter @demo/api exec prisma migrate deploy`, then `pnpm db:seed`
- shadcn `init` / `add` MUST be non-interactive (`--yes` and a pre-generated `components.json` with aliases that do not produce `src/src` or `import ... from "cn"`). A post-step (`scripts/check-shadcn.mjs`) MUST fail the task if shadcn asked a question or generated those paths
- The global `JwtAuthGuard` MUST skip non-HTTP contexts (`context.getType() !== "http"`) so it does not intercept MCP. Tool `inputSchema` MUST be a Zod object the MCP SDK accepts so validation does not throw before the handler. Insufficient scope MUST be the MCP `insufficient_scope` error
- `@casl/ability` 7.1.3 does not export `PureAbility`. `createPrismaAbility` is overloaded, so the compiling type is `ReturnType<typeof createAppAbility>` where `createAppAbility` calls `createPrismaAbility<[string, string]>([])`
- `QueryClient` is imported from `@tanstack/query-core` (the `.d.ts` of `@tanstack/react-query` re-exports hooks, not the class). `stockFeatures` and `createCoreRowModel` are imported from `@tanstack/table-core`
- The CASL checker accepts `permissions.ts` and `*.permissions.ts`
- Playwright `webServer.url` MUST be a GET that returns 2xx. The API pattern includes `GET /api/v1/health`. E2E global setup truncates the e2e database and the servers bind free ports
- `/speckit.analyze` does not commit. When the repo is born empty, specify and clarify commits are the first commits and they live on the feature branch

### Compilable reference snippets

These fences are extracted and typechecked against the skeleton lockfile. Keep them complete.

```typescript
import path from "node:path";
import { defineConfig } from "prisma/config";

function migrationDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const value = env["DATABASE_URL"];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("DATABASE_URL is required for prisma migrate");
  }
  return value;
}

const apiRoot = import.meta.dirname;

export default defineConfig({
  schema: path.join(apiRoot, "prisma", "schema"),
  datasource: {
    url: migrationDatabaseUrl(process.env),
  },
  migrations: {
    path: path.join(apiRoot, "prisma", "migrations"),
    seed: "node --import tsx prisma/seed.ts",
  },
});
```

```typescript
import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") {
      return true;
    }
    return false;
  }
}
```

```typescript
import { createPrismaAbility } from "@casl/prisma";

export function createAppAbility() {
  return createPrismaAbility<[string, string]>([]);
}

export type AppAbility = ReturnType<typeof createAppAbility>;
```

```typescript
import { QueryClient } from "@tanstack/query-core";
import { stockFeatures } from "@tanstack/table-core";

export const queryClient = new QueryClient();
export const features = { ...stockFeatures };
```

### Node.js Active LTS

Node MUST be the current Active LTS, resolved at generation and analysis time. The single source of truth is `https://nodejs.org/dist/index.json`:
- Algorithm: entries whose `lts` is not `false`, then the highest semver. The file is newest-first, so that is the first such entry. Not from memory, not from nodejs.org prose pages, never odd/Current/alpha/beta/rc
- `.nvmrc` MUST exist and MUST contain that exact version (strip the leading `v`)
- `engines.node` MUST be `>=<that major>`; `@types/node`, CI, Docker, and the README MUST use the same major
- Example only, as of 2026-11-13: exact `26.13.1` (Lithium), `engines` `>=26`. Node 22 is Maintenance. The rule is the index, not a hardcoded `26`
- Resolve with: `curl -s https://nodejs.org/dist/index.json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const hit=JSON.parse(s).find(e=>e.lts!==false);if(!hit){console.error("no Active LTS");process.exit(1)}const exact=hit.version.replace(/^v/,"");console.log(exact);console.log(exact.split(".")[0])})'`
- Node 25+ does not bundle Corepack. Do not install it under `/usr`. Linux and macOS: `npm config set prefix ~/.local` and prepend `~/.local/bin` to `PATH`, or use nvm. Windows: nvm-windows, or `npm config set prefix %USERPROFILE%\\.local` and add that directory to the user PATH. Then `npm i -g corepack@latest && corepack enable` (or install the exact `pnpm@X.Y.Z` globally with that prefix). `packageManager: pnpm@X.Y.Z` stays an exact pin
- `/speckit.analyze` runs before implement and is read-only. A missing `.nvmrc` is **not** by itself CRITICAL. Analyze MUST mark **CRITICAL** when `tasks.md` has no setup task that creates `.nvmrc` with the exact index-resolved Active LTS version. When `.nvmrc` already exists, a major that differs from that Active LTS is **CRITICAL**
- Prisma 7.x stable `engines.node` is `^20.19 || ^22.12 || >=24.0` (verified on the latest 7.x stable, not a Prisma 8 prerelease). The Active LTS major is inside that range. The CLI still prints a warning for majors above 24 (including Node 26) and does not exit. That warning is a known exception and MUST NOT block install, verify, or CI. Do not pin an older LTS to hide it

### Cursor Agent command files

With `--integration cursor-agent`, Spec Kit commands are installed as `.cursor/skills/speckit-*/SKILL.md`. They are not installed under `.cursor/commands`.

### Real Tests and Hard Gates

Tests MUST exercise real production code; gates MUST pass before merge:
- MUST NOT write tautological tests that only exercise helpers defined in the same test file
- MUST NOT close a gate with skipped tests (`.skip`, `.todo`, `.only`, `xit`, `xdescribe`)—skipped count MUST be 0
- ALL gates MUST pass with real output as evidence: typecheck, lint, unit tests, API e2e, MCP e2e, Playwright + axe-core, build, `pnpm audit` (no high/critical), `madge --circular`
- CI MUST include a job with a clean Postgres service that runs `prisma generate`, `prisma migrate deploy` (the job fails if the output contains `No migration found`), seed, a real API process (`node dist/main.js`, not only an in-process Nest app) whose `/api/v1/health` returns HTTP 200, `pnpm test:e2e:api`, and Playwright. `/speckit.analyze` MUST mark **CRITICAL** when `tasks.md` has no task for that job. `pnpm lint` MUST run `prisma generate` before ESLint so a missing client is not a lint failure
- Minimums, all required: at least one supertest e2e per REST endpoint against real Postgres, covering 401, CASL 403, refresh-token rotation, and throttling 429; at least one MCP e2e per tool with Bearer and scopes against that Postgres; at least one Playwright spec with axe-core per user story (`screenshot`, `video`, and `trace` `'off'`); at least one unit test per domain service, guard, and CASL policy
- `/speckit.analyze` MUST mark **CRITICAL** when `tasks.md` omits any of those tasks. `/speckit.implement` MUST NOT declare the work finished without running them

### No Screenshots in Tests

Playwright and Vitest MUST NOT generate or store screenshots or image snapshots:
- `playwright.config.ts` MUST set `screenshot: 'off'`
- MUST NOT use `page.screenshot()`, `toHaveScreenshot()`, or image snapshot matchers

### No Ad Hoc Screenshots by AI Agents

AI agents MUST NOT take, generate, or save ad hoc screenshots during `/speckit.implement`, demos, or pilots—not with Playwright, not with a browser, and not with scripts. Visual review is performed by a human (revisión visual humana). Playwright + axe-core gates, including computed Tailwind style verification, remain mandatory and MUST run without screenshots (`screenshot: 'off'`; no `toHaveScreenshot()`; no `page.screenshot()`).

### Authentication and MCP Security

Authentication uses `@nestjs/passport` + `@nestjs/jwt` with CASL authorization:
- If the project has no AuthModule, tasks MUST add a blocking auth phase (login, HttpOnly cookies, CSRF, rotating refresh with reuse detection, roles, user seed) and analyze MUST mark its absence CRITICAL
- Access tokens MUST be short-lived (~15 min); refresh tokens MUST rotate and be stored in HttpOnly + Secure + SameSite cookies with CSRF protection
- Every HTTP handler MUST carry exactly one of three markers. `scripts/check-casl.ts` fails a handler that has none of them:
  - `@Public()` — no session. Use it for routes that create the session (`login`, `refresh`) and for unauthenticated probes such as health
  - `@Authenticated()` from `decorators.ts` — a valid access token and no CASL permission. Use it for `logout`, `me`, and any feature route that only needs a signed-in user (for example listing the caller's own records when the spec does not grant a separate permission)
  - `@Can('category:action')` — feature authorization. Use it for create, update, delete, and for reads that are permission-gated
- Session routes (`logout`, `me`) MUST use `@Authenticated()` and MUST NOT require a feature permission. MCP tools MUST NOT use `@Public()` or `@Authenticated()` in place of a scope: each `@Tool` still needs `@Can(...)` and `scopes` that include that permission
- MCP registration MUST use `McpModule.forRoot({ decorators: [Public(), SkipCsrf()] })` so a missing Bearer token is 401, not a CSRF 403. Pass the verifier as a class (`BearerVerifier`) and resolve the JWT secret inside `verifyAccessToken`, not at module import. `forRoot` MUST set `imports: [AuthModule]` so the dynamic module that constructs `BearerVerifier` receives `JwtService` from the module that exports `JwtModule`. A `@Global()` re-export is not that injection
- MCP stays in the preset and is opt-in. `MCP_ENABLED=true` or `MCP_ENABLED=1` mounts `ApiMcpModule`; any other value, including unset, leaves it off. `.env.example` MUST default to `false` so a project without tools does not boot the endpoint. The skeleton CI sets `MCP_ENABLED=true` when it healthchecks the real process and when it runs the MCP e2e, because the preset still ships the verifier. `AppModule` reads the flag through `mcpEnabled()` in `apps/api/src/config`
- Passwords MUST be hashed with Argon2id; login endpoints MUST have throttling
- MCP endpoints MUST require Bearer token: missing or invalid token MUST return exactly 401 with `WWW-Authenticate: Bearer` header
- `apps/api` MUST declare `@modelcontextprotocol/client` as a devDependency (latest stable). `@nestjs/mcp/testing` imports it and does not declare the dependency
- Secrets MUST be read at runtime from the environment; MUST NOT use hardcoded fallbacks. `.env.example` MUST list every name the app reads (`process.env.NAME`, `process.env["NAME"]`, `requiredEnv("NAME")`, `env["NAME"]`) with placeholders and no real secrets. `specify init` copies that file from the reference skeleton. `scripts/check-env-example.mjs` MUST fail when a read name is absent

### Authentication security rules

These rules are mandatory for every authentication feature (login, account recovery, one-time passwords or tokens, session issuance, password change, and mail that carries auth secrets). Each applicable rule MUST have tests. A rule that does not apply MUST be marked not applicable with a reason.

- Temporary and one-time passwords and tokens are single-use. Consume them atomically on first success. Any later successful login or password change invalidates them
- Account recovery and login never reveal whether the account exists or why a login was rejected. Same status, same body, and similar latency. Every rejection path pays the Argon2 cost: verify the stored Argon2id hash when one exists, and otherwise verify a fixed dummy Argon2id hash with the same parameters as real hashes (missing account, missing credential, inactive, locked or blocked, or any other 401 that does not verify a real hash). Hashing, database writes, and email cannot change the response
- Counters used for lockout or rate limits are updated inside one database transaction (per-key `pg_advisory_xact_lock` or an atomic upsert-increment). Never read-then-write and never count-then-insert. Reject inside that transaction, purge expired rows in the same transaction, and cover it with a concurrency test
- Client IP for audit and rate limits comes from `request.ip`. Trust `X-Forwarded-For` only through an explicit, configured trust-proxy setting, and validate the value. Do not read the header directly
- A session that must change its password, or is otherwise restricted, carries no business scopes. Guards allow only the change-password, logout, and me endpoints. Refresh does not reissue scopes
- Outbound SMTP that carries secrets requires TLS (`secure` or `requireTLS`). Plaintext is allowed only for a loopback dev mail catcher
- Password change and session revocation invalidate existing access tokens and refresh tokens. Reject tokens issued before `passwordChangedAt` (`password_changed_at`) or an older token version. The refresh endpoint runs that check before issuing a new pair
- A guard bypass (for example `/mcp`) compares the parsed path only. Never `originalUrl.includes` or `url.includes`: a query string that contains the bypass path must not skip the guard

### Reglas de autenticación

- **Sin enumeración.** La recuperación y el login no revelan si la cuenta existe ni el motivo del rechazo: mismo estado, mismo cuerpo y latencia parecida. Cada camino de rechazo paga el coste Argon2: se verifica el hash Argon2id guardado cuando existe y, si no, un hash Argon2id ficticio fijo con los mismos parámetros que los hashes reales (cuenta ausente, sin credencial, inactiva, bloqueada o cualquier otro 401 que no verifica un hash real). El hash, las escrituras y el correo no cambian la respuesta
- **Contadores atómicos.** El bloqueo y el rate limit se actualizan en una sola transacción, con `pg_advisory_xact_lock` por clave o un upsert que incrementa. Esta regla prohíbe read-then-write y count-then-insert. El rechazo ocurre dentro de la transacción, las filas vencidas se purgan en esa misma transacción, y hace falta un test de concurrencia
- **Invalidación.** Un cambio de contraseña o la revocación de sesión invalidan los access tokens y los refresh tokens emitidos antes de `password_changed_at` o con una token version anterior. El endpoint de refresh hace esa comprobación antes de emitir
- **Bypass de guards.** Una excepción de ruta (por ejemplo `/mcp`) compara solo el path ya parseado. Nunca `originalUrl.includes` ni `url.includes`: una query que contiene el path de bypass no abre la ruta

### Frontend Stack

React SPA with mandatory libraries and patterns:
- MUST depend on the `shadcn` package (latest stable) in `packages/ui` and `apps/web` because the CSS imports `shadcn/tailwind.css`
- MUST run `shadcn init` and then a non-interactive `shadcn add button input label card badge dialog select dropdown-menu table skeleton form --yes --overwrite`. `init` does not generate primitives
- Primitives live in `packages/ui/src/components/`, exported by the package, consumed by `apps/web`
- MUST NOT reimplement shadcn/ui primitives by hand (Button, Input, Dialog, Table, Card, Badge, Select, Dropdown, etc.)
- MUST use Tailwind CSS only for custom styling, layouts, and spacing—not to rebuild existing primitives
- `apps/web/src/index.css` MUST include `@source` directive pointing to `packages/ui/src` for Tailwind 4 to generate classes used by shared primitives
- The browser MUST call the API through the Vite `/api` proxy in `server` and `preview`, aimed at `API_PROXY_TARGET` (the API port). Playwright MUST use the web origin and request `/api` through that proxy so cookies and CSRF stay same-origin. Direct browser calls to the API host are the exception: set `CORS_ORIGIN` and enable CORS with `credentials: true`. Leave `CORS_ORIGIN` empty when the proxy is in use
- MUST use TanStack Router with file-based routing
- MUST use TanStack Query for all server state (no duplicating API data in Zustand)
- Route loaders MUST call `queryClient.query(options)` (`ensureQueryData` and `prefetchQuery` are deprecated and fail `no-deprecated`)
- `packages/ui` MUST be source-only (exports point at `src`, not `dist`)
- MUST use TanStack Table v9 API (`useTable` + `stockFeatures`, not legacy `useReactTable`)
- At least one Playwright spec MUST verify computed styles (e.g., button background not transparent, cell padding > 0) to catch CSS generation failures

### No example domain

The stack does not include example modules, data, users, or screens. Every domain starts from a Spec Kit feature. Demonstration code and demonstration seed are forbidden, including `example.com` accounts.

The skeleton keeps generic infrastructure only: health, guards, CASL wiring, the Prisma module, config, and the identity tables the auth design needs (`User`, `Permission`, `UserPermission`, `RefreshToken`) plus append-only `AuditLog`. It does not seed those tables. The first feature defines domain models and any accounts. `/speckit.analyze` MUST mark **CRITICAL** when the project contains demonstration code or seed (a notes or widgets slice, `notes:*` or `widgets:*`, `replace-example-slice`, or an `example.com` account).

### Código limpio y quality gates

El skill `clean-code-typescript` (adaptado de `ertugrul-dmr/clean-code-skills`, `skills/typescript`, licencia MIT; ver `NOTICE`) se carga en `/speckit.implement` y `/speckit.converge`. Obliga lo que el linter no mide: nombres en inglés que dicen el efecto (N7), sin parámetros booleanos de modo (F3), ley de Demeter (G36), guard clauses y tests de bordes (T5). G23 (polimorfismo en vez de if/else) es sugerencia. T9 (tests unitarios de menos de 100 ms) solo se menciona. No se aplican reglas de comentarios estilo Java.

Reglas medibles, en `pnpm lint`:

- F1: `mas/max-callable-params` máximo 3. Los constructores NestJS con DI no cuentan. `max-params` de ESLint queda apagado para no duplicar el conteo
- G30: `sonarjs/cognitive-complexity` ≤ 15, `max-depth` 3, `max-lines-per-function` 60. Los tests no cuentan para el tope de líneas
- `@typescript-eslint/no-explicit-any` es error en todo el esqueleto, incluidos contratos, DTOs y exports públicos. Desactivarlo sigue prohibido
- C5: `mas/no-commented-code` en warn. G25: `no-magic-numbers` en warn (permitidos -1, 0, 1 y los códigos HTTP; tests excluidos)
- knip (código, exports, archivos y dependencias sin uso) y `sonarjs/no-identical-functions` más jscpd
- `mas/no-hidden-service-deps`: un `*.service.ts` no llama a `Date.now()`, `new Date()` sin argumento ni `Math.random()`, y no hace `new` de una clase con efectos. Inyecta `SystemClock` e `SystemIdGenerator` de `apps/api/src/modules/platform`

Adopción: lo existente queda en warn y entra al trinquete `quality-baseline.json` (por regla y archivo, más clones de jscpd y hallazgos de knip). El CI falla si un conteo sube. Si baja, el mismo PR corre `node scripts/check-quality-baseline.mjs --update`. `scripts/check-diff-quality.mjs` trata warn de adopción como error en las líneas nuevas del diff. El paso a error total está en `docs/quality-loop.md`.

`/speckit.converge` (y cualquier corrección de bugs) corre el quality loop: tras implementar y tras cada ronda, lint, knip, jscpd y dependency-cruiser, hasta 3 vueltas. Termina con cero hallazgos nuevos o con la excepción escrita (archivo, regla, motivo).

Cobertura: líneas y ramas del diff ≥ 80 % (`vitest --coverage` y `scripts/check-diff-coverage.mjs`). Sin umbral global. Un componente web que supera el umbral de condicionales MUST tener un `*.test.tsx` de Testing Library. `tsconfig` MUST usar `strict`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`. ESLint MUST usar `typescript-eslint/strictTypeChecked`. Cada PR corre gitleaks (`.github/workflows/gitleaks.yml` y el job del preset).

`/speckit.analyze` MUST citar el código de regla (F1, F3, G5, G30, G36, N7, C5, T5) y MUST marcar **HIGH** cuando falte el test del componente o la cobertura del diff, y **CRITICAL** cuando un service esconda el reloj o el azar.

### Modularidad estricta

Todo proyecto generado con este preset MUST cumplir estas reglas. Cada una nombra el control que la hace fallar (`pnpm lint` ejecuta ESLint, dependency-cruiser y los fixtures negativos).

- MUST haber un módulo Nest por dominio en `apps/api/src/modules/<dominio>/`, con `index.ts` público y `<dominio>.module.ts`. `AppModule` solo compone: registra el módulo con un `import` en `imports`. MUST NOT importar archivos internos de otro módulo; solo su `index.ts`. Reglas: `mas/module-layout`, `mas/public-module-api`. dependency-cruiser: `no-foreign-module-internals`
- MUST respetar controller → service de caso de uso → `*.repository.ts`. Solo los repositorios y `apps/api/src/modules/prisma` importan `@prisma/client` o `PrismaService`. Un controller MUST NOT importar Prisma ni un repositorio, y MUST NOT contener bucles, cálculos ni condicionales de negocio: solo delega al service. Un `if` que rechaza un input ausente (`throw`) sí puede quedar; la validación de forma vive en pipes y DTO. `PrismaModule` MUST NOT ser `@Global()`. `@Global()` y `global: true` solo en `apps/api/src/config`. `AuthBridgeModule` puede reexportar auth, y además `McpModule.forRoot` MUST importar `AuthModule` (`imports: [AuthModule]`) porque el verifier se construye dentro del módulo dinámico y un reexport global no le entrega `JwtService`. El seed y los `*.e2e.ts` pueden abrir un cliente porque no atienden requests. Reglas: `mas/prisma-only-in-repositories`, `mas/thin-controllers`, `mas/no-global-module`. dependency-cruiser: `no-controller-prisma`
- MUST NOT pasar de 300 líneas por archivo ni de 60 por función (sin contar vacías ni comentarios). Una excepción MUST llevar `eslint-disable` con justificación tras `--`. Reglas: `max-lines`, `max-lines-per-function`, `mas/require-disable-justification`
- MUST NOT haber estado mutable de módulo (`let`, `var`, `new Map`, `new Set`, arrays mutables en el top-level de `apps/`). Los contadores y el rate limit viven en Postgres (`rate_limit_buckets`), no en memoria. Regla: `mas/no-module-state`
- Un guard MUST NOT decidir un bypass con `originalUrl.includes` ni `url.includes`. Compara solo el path parseado. Regla: `mas/no-url-includes-in-guards`

### Subida de archivos

La subida de archivos MUST usar `multipart/form-data`. El handler MUST declarar `FileInterceptor`, `FilesInterceptor`, `FileFieldsInterceptor` o `AnyFilesInterceptor` con `limits.fileSize` (número positivo) y MUST validar extensión y MIME: `fileFilter` de Multer, o `ParseFilePipe` con `FileTypeValidator` y `MaxFileSizeValidator`, o un validador propio de magic bytes. `MaxFileSizeValidator` solo no basta. Regla: `mas/multipart-upload-limits` (error en `pnpm lint`).

JSON con el archivo en base64 (`@IsBase64`, nombres `*base64*`, `*fileContent*`, `*dataUrl*`, URIs `data:` o `Buffer.from(contenido, "base64")` en un controller, servicio o DTO) MUST NOT ser el camino por defecto. Solo se admite si el string base64 mide como máximo 1 MiB (`1_048_576` caracteres), con el tope escrito en el DTO (`@MaxLength(1048576)` o `z.string().max(1048576)`), y si la línea lleva una excepción justificada: `// eslint-disable-next-line mas/no-base64-file-upload -- <motivo>`. El preset ya exige descripción en toda supresión (`@eslint-community/eslint-comments/require-description` y `mas/require-disable-justification`). Sin el tope, la supresión no alcanza. Reglas: `mas/no-base64-file-upload` y `mas/base64-upload-max-length`.

`/speckit.plan` y `/speckit.tasks` MUST planear el interceptor, el límite y la validación de tipo cuando la feature sube archivos. `/speckit.analyze` MUST marcar **CRITICAL** si `plan.md` o `tasks.md` suben un archivo sin ese multipart, o si dejan el base64 sin tope de 1 MiB y sin la supresión justificada.

### Formatos estándar

No se escriben a mano parsers ni lectores de formatos estándar: Excel/xlsx, CSV, ZIP, XML y PDF. El código MUST usar las librerías del archivo de librerías aprobadas, `.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`, que `specify init --stack nestjs-react` copia con el preset.

- Excel/xlsx: `exceljs` (lectura en streaming y escritura). El paquete npm `xlsx` (SheetJS) está prohibido. `typed-xlsx` queda descartado para importar porque solo escribe
- CSV: `csv-parse`. MUST NOT partir líneas de un archivo subido con `.split(',')` o `.split(';')`
- ZIP: no hay librería aprobada. `inflate`, `inflateRaw`, `unzip` y `gunzip` de `node:zlib` / `zlib` (sync o stream) en código de la app son un lector casero. El plan MUST consultar o justificar la librería, sin inventar una aprobación
- XML: no hay librería aprobada. Una regex sobre `<row`, `<c`, `<sheetData` o `sheet1.xml` es un parser casero. El plan MUST consultar o justificar la librería, sin inventar una aprobación
- PDF: generar desde HTML o plantillas con Playwright/Chromium `page.pdf()` (certificados y reportes, reutilizando componentes y estilos); armar o modificar (unir, formularios, estampar) con `pdf-lib`; extraer texto con `unpdf` (sobre pdfjs-dist). MUST NOT haber un parser ni un generador de PDF a mano (`%PDF-`, `xref`, `trailer`, `startxref`, `obj` / `endobj`)
- La subida sigue en Multer / `FileInterceptor` con las reglas de **Subida de archivos**

Regla: `mas/no-handrolled-format-parsers` (error en `pnpm lint`), más `no-restricted-imports` sobre `xlsx`. Una excepción MUST llevar `// eslint-disable-next-line mas/no-handrolled-format-parsers -- <motivo>`. `/speckit.plan`, `/speckit.tasks` y `/speckit.implement` MUST leer ese archivo. `/speckit.analyze` MUST marcar **CRITICAL** cuando `plan.md` o `tasks.md` usen una librería prohibida (`xlsx`, `typed-xlsx` para importar, un parser casero de estos formatos, o un PDF escrito a mano) o cuando ZIP/XML no consulten ni justifiquen la librería.

### Librerías de producto

El mismo archivo de librerías aprobadas nombra el resto del stack. No se agrega una librería prohibida y no se inventa una aprobación.

- Gráficos: solo Recharts. `d3-sankey` únicamente si hay un Sankey. Un heatmap es un `<table>` accesible. `chart.js`, `react-chartjs-2` y `echarts` (salvo supresión justificada) están prohibidos, con subrutas. `mas/no-handmade-charts` (warn) marca un `<svg>` de coordenadas calculadas o `getContext('2d')`. Un ícono con path literal puede quedar
- Fechas: `date-fns`, `@date-fns/tz` y `react-day-picker` (Calendar de shadcn). `moment` y `dayjs` están prohibidos. `mas/no-manual-date-math` (warn) marca `getTime()` ± `86400000` y `setDate(getDate() + n)`
- Formularios: `react-hook-form` y `@hookform/resolvers/zod`. `mas/no-manual-form-errors` (error)
- HTML: DOMPurify en la web; `isomorphic-dompurify` o `sanitize-html` en la API. `mas/no-regex-html-sanitize` y `mas/no-dangerous-html-unsanitized` (error). `dangerouslySetInnerHTML` solo con el resultado de `.sanitize`
- Imágenes: de entrada solo PNG y JPG (ni HEIC ni WebP), validados con `file-type`. `sharp` aplica `.rotate()` (orientación EXIF), quita metadatos, recorta al centro (`fit: 'cover'`, `position: 'centre'`) y escribe variantes fijas: avatar 128 y 512, banner 1600×500, portada 1280×720. La salida es JPEG o WebP con calidad 80. El navegador MUST NOT recibir el original. El helper de referencia es `apps/api/src/images/normalize-image.ts`. `mas/no-client-file-type-trust` (error) sigue marcando `originalname` y `mimetype`. Una URL firmada de S3 usa `@aws-sdk/s3-request-presigner`
- Video: solo peso y tipo real. La API MUST declarar `limits.fileSize` (por ejemplo 100 MB) y MUST validar el tipo con `file-type`. MUST NOT validar la duración en el servidor y MUST NOT usar `ffprobe` ni `fluent-ffmpeg`
- Colas, cron y trabajos en background: pendiente de decisión (candidatos BullMQ+Redis o pg-boss sobre Postgres). No hay librería aprobada. `@nestjs/schedule`, `node-cron` y `agenda` no están prohibidos. `mas/no-timer-scheduling` (warn) marca `setInterval` y un `setTimeout` de 1000 ms o más en la API. El plan MUST justificar el mecanismo elegido mientras no haya uno aprobado
- Correo: plantillas `.mjml` compiladas con `mjml` / `mjml2html` y `validationLevel: 'strict'`. La interpolación recomendada es Handlebars con `{{ }}` (escapa por defecto). `{{{ }}}` necesita una supresión justificada. No se usa `react-email`. `mas/no-handmade-email-html` (error) marca `<html`, `<table` o `<body` en strings de correo, y el triple-stash. `pnpm lint` ejecuta `scripts/check-mjml.mjs`: `fixtures/email/welcome.mjml` compila en strict y `broken.mjml` tiene que fallar
- IA: Vercel AI SDK o el SDK oficial del proveedor, con salida validada por zod. Transcripción con `@deepgram/sdk`. `mas/no-direct-llm-fetch` (error) marca `fetch`, `axios` o `got` a `/chat/completions`, `/v1/messages`, `/completions` o `/embeddings`
- Interfaz: `canvas-confetti` y las animaciones MUST respetar `prefers-reduced-motion` (`mas/reduced-motion-animations`, error). Visor de imágenes: `yet-another-react-lightbox`. Visor PDF en el navegador: `react-pdf` (solo visor; el texto se extrae con `unpdf`). Subida en el cliente: `react-dropzone`. Arrastre: `@dnd-kit`
- API: `apps/api/src/main.ts` MUST llamar a `helmet()` (`mas/require-helmet`, error). Los logs MUST usar `nestjs-pino`; `no-console` está en error en `apps/api`. Un `VITE_*` con `KEY`, `SECRET` o `TOKEN` está prohibido en `apps/web` (`mas/no-secret-in-client`). `process.env` solo en `apps/api/src/config`, validado con zod (`mas/no-process-env` y `mas/no-raw-process-env`)
- Auth, recuperación de acceso, IA y subidas MUST llevar `@Throttle` o `SensitiveThrottle` (`mas/require-throttle-sensitive`, error). En el esqueleto el guard global sigue aplicando `LOGIN_THROTTLE_LIMIT`; `SensitiveThrottle` marca la ruta sin pisar ese valor
- `socket.io`, `socket.io-client` y `ws` están prohibidos, con subrutas, salvo un requisito real y una supresión justificada

`/speckit.analyze` MUST marcar **CRITICAL** cuando una ruta nueva no tiene axe, cuando una imagen acepta un formato distinto de PNG o JPG, cuando se sirve el original, cuando faltan las variantes fijas (avatar 128 y 512, banner 1600×500, portada 1280×720) o el test de dimensiones, orientación y EXIF removido, o cuando un correo no compila su `.mjml` en strict. MUST marcar **HIGH** cuando un video no tiene test del límite de peso y del tipo real (`file-type`), cuando un dashboard con ruta de impresión no genera un PDF no vacío con `isAnimationActive={false}` en Recharts, cuando una fecha persistida no queda en UTC con la zona de la organización, o cuando hay trabajos en background y el plan no justifica el mecanismo (BullMQ+Redis o pg-boss) mientras siga pendiente la decisión. El esqueleto no trae un dashboard ni una subida de producto: esos tests viven en la feature, no en un demo del preset. El CI del preset sí compila los `.mjml` de `fixtures/email/` dentro de `pnpm lint`.
- MUST NOT haber ciclos de import. Reglas: `import-x/no-cycle` y dependency-cruiser `no-circular` (ambos dentro de `pnpm lint`)
- El front MUST vivir en `apps/web/src/features/<feature>/` (`components`, `hooks`, `api`, `routes`, `index.ts`). MUST NOT importar internos de otra feature. `fetch` solo en `hooks/` o `api/` de la feature. El shell recibe acciones por props y arma la nav desde `feature-routes.ts`. Las rutas MUST cargar la feature con `import()`, nunca con un import estático. Reglas: `mas/module-layout`, `mas/public-module-api`, `mas/fetch-in-feature-data`, `mas/lazy-feature-routes`
- `packages/ui` MUST ser solo primitivas genéricas: no importa contracts, rutas ni código de apps. `packages/contracts/src/<dominio>/index.ts` es la entrada pública de ese dominio (`@demo/contracts/<dominio>`). MUST NOT importar internos de otro contrato. Reglas: `boundaries/dependencies`, `mas/contracts-public-index`, dependency-cruiser `ui-primitives-only` y `contracts-are-leaf`
- Un repositorio MUST usar solo los delegates Prisma de su dominio (`eslint/model-ownership.js`). El acceso cruzado pasa por el service exportado del otro módulo. Regla: `mas/own-models-only`
- Agregar un dominio MUST tocar solo la línea de `imports` en `AppModule`, el registro en `feature-routes.ts` y el mapa de ownership. El resto lo crea `pnpm gen:module <dominio>` (módulo, feature, `packages/contracts/<dominio>`, `prisma/schema/<dominio>.prisma`). El esquema Prisma MUST ser multi-archivo bajo `prisma/schema/` (generador solo en `base.prisma`; `prisma` y `@prisma/client` en 7.10.1). Eso no cabe en ESLint: lo cubren `scripts/check-prisma-layout.mjs` y `scripts/check-gen-fitness.mjs` (genera dos dominios, corre lint, typecheck, test y build, exige que el diff no salga de esos archivos y los borra)

### Reutilización

Una capacidad transversal MUST vivir en un módulo común, no dentro del módulo de negocio que la usa. El plan MUST incluir la sección **Reutilización**: revisa los módulos comunes que ya existen y decide si la capacidad es genérica (módulo común) o propia de la feature.

Quedan como guías de esqueleto, no como código de negocio, en `.specify/presets/mas-stack-nestjs-react/templates/common-modules/`:

- `tabular-import.md`: pipeline parse → normalizar → validar → reconciliar → aplicar por lotes, independiente de si la fuente es un archivo o un webservice. xlsx con `exceljs`, CSV con `csv-parse`
- `file-upload.md`: multipart, `file-type` y `sharp`, con los estándares de subida e imágenes
- `mail.md`: plantillas MJML compiladas en strict e interpolación Handlebars

`/speckit.analyze` MUST marcar **CRITICAL** si importar archivos tabulares, subir archivos o imágenes, o enviar correo queda implementado en un módulo de negocio, o si `plan.md` omite **Reutilización**.

### Migraciones seguras sobre datos existentes

Toda migración MUST poder aplicarse sobre datos que ya existen. En producción solo corre `prisma migrate deploy`. El seed no es un mecanismo de despliegue: `pnpm db:seed` y `pnpm db:setup` son para desarrollo local y para e2e.

- MUST NOT editar una migración que ya se aplicó en testing o producción. El arreglo es una migración nueva. `scripts/lint-migrations.mjs` (dentro de `pnpm lint`) compara `prisma/migrations/*/migration.sql` con la rama base (`MIGRATION_BASE_REF`, `origin/$GITHUB_BASE_REF`, `origin/master` u `origin/main`) y falla con `edited-migration` si el SQL cambió
- MUST NOT agregar `NOT NULL` (incluido `ADD COLUMN ... NOT NULL`) a una tabla que ya existe sin `DEFAULT` y sin un backfill previo (`not-null-add`, `not-null-set`)
- MUST NOT hacer `UPDATE` que asigne NULL a una columna que en ese punto del archivo sigue siendo `NOT NULL` (`null-into-not-null`). El orden importa: primero `DROP NOT NULL`, después el `UPDATE`
- `DROP COLUMN`, `DROP TABLE`, `TRUNCATE`, `DELETE` sin `WHERE`, un cambio de tipo y un renombre de tabla o columna MUST llevar en la sentencia el comentario `-- mas:allow-destructive <motivo>`, con un motivo no vacío. Sin eso el código es `destructive`
- Un índice o constraint `UNIQUE` sobre una tabla que ya existía MUST tener ese mismo comentario o un backfill que elimine duplicados (`unique-on-existing`)
- Un cambio destructivo MUST ir en dos migraciones expand/contract: primero ampliar (columna nueva, nullable, backfill) y solo después, con la marca, retirar lo viejo
- `pnpm lint` MUST ejecutar `scripts/lint-migrations.mjs` sobre las migraciones reales y `scripts/check-migration-fixtures.mjs` sobre los fixtures negativos. Cada fixture tiene que fallar con su código
- CI MUST incluir el job `upgrade-on-data` de `.github/workflows/upgrade-on-data.yml` (el esqueleto lo trae; `specify init` lo deja en `.specify/reference/` y el proyecto lo copia con el resto del esqueleto). Ese job aplica las migraciones de la rama base, corre el seed contra esa base de loopback y luego `prisma migrate deploy` con las migraciones del PR. El job `skeleton-boot` del workflow de humo ejecuta el mismo script (`--split-last` y `--prove-reject`)
- `/speckit.analyze` MUST marcar **CRITICAL** cuando `tasks.md` no pide migraciones seguras sobre datos existentes, el lint de migraciones, o el job `upgrade-on-data`

### Database Naming

Prisma models and the physical PostgreSQL schema use English names only. The UI translates labels; the schema does not.

- Prisma models MUST be English, PascalCase, and singular, one domain per file under `prisma/schema/` (for example `Employee`, `AccessLog`)
- Physical tables MUST be English, snake_case, and plural via `@@map` (for example `@@map("employees")`, `@@map("access_logs")`)
- Physical columns MUST be snake_case via `@map` when the Prisma field name is not already that column name (for example `passwordHash String @map("password_hash")`)
- MUST NOT use Spanglish in model names, field names, `@@map` / `@map` targets, or persisted enum values. Domain and enum codes stored in the database MUST be English; the UI translates them
- Exception: a field that must match an external source system 1:1 (for example a payroll feed) MAY keep that source name on the Prisma model. Its physical column MUST still be snake_case via `@map`. Document the exception next to the field (a Prisma comment naming the source system and why the model name is not translated)

### Comprehensive Auditing

Every relevant action MUST be audited—this is foundational, not optional:
- Audited actions: create, update, soft delete, restore, hard delete, permission changes, auth events, exports, MCP tool calls
- Append-only `AuditLog` enforced at DB level (role with only INSERT/SELECT or trigger)
- Audit write in same `$transaction` as business operation or via outbox pattern
- Sensitive data masked; retention via monthly partitions

### Bitácora de actividad

MUST: cada caso de uso que crea, modifica o elimina datos, cambia configuración, permisos, idioma, marca o sesión, o es un evento de seguridad (inicio de sesión, fallo, bloqueo, recuperación, impersonación) registra un evento append-only. El evento lleva actor, persona afectada cuando aplica, tipo de evento, resultado, timestamp y metadatos sin secretos. Nunca se persisten contraseñas, hashes ni tokens.

Los tipos de evento se declaran en el catálogo extensible `packages/contracts/src/audit/index.ts` (`AUDIT_CATALOG`): clave, clave i18n presente en todos los idiomas declarados, y tono (`neutral`, `success`, `warning`, `danger`). Ese catálogo alimenta el filtro de tipos de la pantalla Actividad. Registrar un tipo que no está en el catálogo falla en tiempo de ejecución (`requireAuditEventKey`).

Las lecturas puras no se registran, salvo que la spec lo pida. La única excepción es explícita y justificada (`@NoAudit('motivo')` en el handler y la misma justificación en la spec).

El handler Nest que usa `@Post`, `@Put`, `@Patch` o `@Delete` MUST llevar `@Audit('clave')` con una clave del catálogo, o ese opt-out. `mas/require-audit-on-mutations` dentro de `pnpm lint` rechaza el handler sin uno de los dos y rechaza una clave no declarada. El caso que se escapó: cambiar el idioma en admin no dejaba fila en la bitácora ni aparecía en Actividad.

### Soft Delete by Default

Soft delete is mandatory for all business entities:
- Models include `deletedAt DateTime?` and `deletedBy String?`
- Hard delete requires `<category>:eliminar_permanente` permission and justification
- Extension order: `$extends(createCaslExtension()).$extends(softDeleteExtension)`

### Performance Principles

Performance is a first-class requirement:
- No N+1 queries; explicit `select`; indexed columns
- Server-side pagination mandatory (default 20, max 100)
- Async heavy work; short transactions; p95 < 300 ms target

### Locale resolution

Product copy goes through `i18next` and `react-i18next`. Dictionaries live in `apps/web/src/locales/<tag>.json`. The skeleton ships `es-CL` only. Add `en`, `pt-BR`, `fr-FR`, or any other tag only when the feature spec requires it. Every key used in source, and every key present in any dictionary, MUST exist in every declared locale. `scripts/check-i18n.mjs` (`i18n:check`) runs inside `pnpm lint` and fails on a missing key or an orphan key.

One module, `apps/web/src/i18n/locale.ts`, resolves the active locale. The order is fixed: the person's preference, then the `locale` cookie, then the browser language, then the organization default. Tags match exactly against the declared list. The browser MUST NOT replace a supported cookie. `i18n.changeLanguage` and other i18n mutations (`addResource`, `addResourceBundle`, `removeResourceBundle`, `setDefaultNamespace`) run only in an event handler or in an effect that guards with `if (i18n.language !== next)` before the call. Calling them in the render body of a component or hook is forbidden: it loops and pins the language control. `useApplyLocale` in that module is the only product `useEffect` outside `apps/web/src/shared/hooks/**`.

`t()` and `i18n.t()` are forbidden at module scope and inside navigation constants. Store `labelKey` and translate while rendering, so a language change updates menus without a reload. Visible JSX text and the props `aria-label`, `title`, `placeholder`, and `alt` come from `t()`. Punctuation, numbers, and the exact strings in `apps/web/src/i18n/literal-allowlist.json` are the only literals. The rules are `mas/no-i18n-mutation-in-render`, `mas/no-module-translation`, and `mas/no-literal-copy`, all inside `pnpm lint`, with a valid case and an invalid fixture for each.

When a feature declares more than one locale, a language switcher, or login copy, `plan.md` and `tasks.md` MUST include this module, these lint rules, `i18n:check`, and the tests. The skeleton has no login screen. A feature that adds login MUST copy `.specify/reference/templates/i18n-login.spec.ts` and keep `screenshot`, `video`, and `trace` off. The spec changes language on the login screen, checks that the visible text changes, checks that a later click responds within 500 ms (a render loop fails this), signs in, reloads, checks that the locale remains, and checks that navigation text changes without a reload. `/speckit.analyze` MUST mark **CRITICAL** when an i18n feature omits any of these gates or tests.

### Prototype fidelity

When a feature ports an HTML prototype from product, the visual design is a requirement. Fidelity includes icons (the same library and the same glyphs), computed colors, and the hover and active states. `pnpm lint` is the primary gate for icons and colors. `pnpm test:fidelity` is the backup for computed color, hover, and active, which lint cannot see. The gate does not take screenshots, video, or traces.

#### Tokens

Extract every design value literally from the prototype CSS and from the Tailwind CDN `tailwind.config` (colors, font families, weights, radii, shadows, spacing, breakpoints). Write them to `apps/web/src/styles/prototype-tokens.json`. The shadcn and Tailwind 4 theme (`apps/web/src/index.css` `@theme`) MUST be generated from that file. If the prototype defines a value, the skeleton default for that value is forbidden (including default grays, radii, and shadows).

#### Brand assets

Copy logos, SVG marks, illustrations, and the favicon. Write `apps/web/src/assets/brand-manifest.json` with the prototype path and the app path for each file. A logo MUST be the copied image or SVG, never a text substitute. Self-host the same font files and the same weights the prototype uses. Do not copy demo photos or demo avatars.

#### Motion

Copy `@keyframes`, `transition`, and easing literally. Keep a `prefers-reduced-motion: reduce` rule that disables non-essential animation. The fidelity gate compares animation with reduced motion off, and it fails if the prototype CSS has `@keyframes` and the app CSS drops `prefers-reduced-motion`.

#### Shell design versus scaffolding

Do not port scaffolding: Tailwind CDN, jQuery, icon CDN scripts, sim-bar, and prototype scripts. Do port the shell design: header, rail and menu, widths, gradients, icons, and the collapsed and mobile states. A `handoff.md` line that says the shell is out of scope does not drop the shell design.

#### Icons

When the prototype uses an icon library (Font Awesome classes such as `fa-solid fa-gauge`, Material Symbols, Lucide, or another set), the plan and the tasks MUST use that same library and those same glyphs. Install the official npm package and import each icon from it. Do not load the library from a CDN (the CSP forbids it). Re-export the icons from one central module, `apps/web/src/icons/index.ts`.

Write `apps/web/ui.icons.json` with `library` (the npm package) and `module` (the central file). `mas/icon-library` allows only that package, and only inside the central module. Changing the library is a change to that JSON, not an eslint-disable. `lucide-react` is the fallback only when the prototype defines no icon library. Do not keep it when the prototype names another library.

The React element MUST set `data-icon` to the prototype glyph, for example `fontawesome:fa-solid fa-gauge`. The extractor in `apps/web/e2e/fidelity.ts` records, for each mapped element, the icon library and name, the computed color, the computed background, the font-family, and the hover and active states. It reads computed style, not the variables on `:root`.

#### Colors

No literal colors in TSX or in CSS outside the theme file `apps/web/src/index.css`: no hex, `rgb`/`rgba`, `hsl`/`hsla`, `oklch`, the names `white` and `black`, or Tailwind arbitrary colors (`text-[#fff]`, `bg-white`, `text-black`). `mas/no-literal-color` covers components. `scripts/check-colors.mjs` (inside `pnpm lint`) covers CSS. A `var(--token)` used in other CSS MUST be defined in the theme file for `:root` (inherited) or for the same selector. A token defined only under `.dark` MUST NOT be used from `:root`.

The Playwright check compares those computed values, including hover via `hover()` and active via pointer down, and compares icons through `data-icon`. `@axe-core/playwright` MUST report color contrast (`color-contrast`) on the app page. A theme variable that is white in `:root` does not prove the element is white: `.rail-link[aria-current=page]` and `:hover` can compute a different color. Comparing `:root` variables is not a fidelity check.

Name prototype styles `styles-prototype.css`, not a framework name. Put `data-testid` on the shell and on brand assets. Ship the same tokens as JSON, not only as CSS.

#### Spec map

`spec.md` MUST include this map, and `specs/<feature>/fidelity-map.json` MUST repeat it for the gate. Each row names the prototype element, the React element, and the properties to compare:

```json
{
  "prototype": "prototypes/shell",
  "app": "http://127.0.0.1:5173",
  "tolerances": { "lengthPx": 0, "durationMs": 0, "colorChannel": 1 },
    "fonts": ["400 16px \"Brand Sans\""],
  "pairs": [
    {
      "prototype": "[data-testid='app-header']",
      "app": "[data-testid='app-header']",
      "viewport": { "width": 1280, "height": 800 },
      "properties": ["padding", "color", "background", "font-family", "font-size", "font-weight", "width", "height", "border-radius", "box-shadow", "transition"]
    },
    {
      "kind": "logo",
      "prototype": "[data-testid='brand-logo']",
      "app": "[data-testid='brand-logo']"
    }
  ]
}
```

`background` compares `background-color` and `background-image`. `transition` compares property, duration, and timing function. `kind: "logo"` requires an `img` or `svg` whose natural width and height match the prototype and are greater than 0. `fonts` entries are passed to `document.fonts.check` on both pages. Colors accept hex, `rgb`/`rgba`, and `oklch` and compare after conversion. A mismatch is reported as `app-header padding 12px vs prototipo 16px`.

`pnpm test:fidelity` serves a prototype directory and the app (directory or URL) and runs this comparison with Playwright. It does not call screenshot, video, or trace. With no `specs/**/fidelity-map.json` and no `--map`, it exits 0. When a map exists, `pnpm verify` and `/speckit.implement` fail the feature until the command exits 0.

#### Repeated components

When the prototype repeats a structure (settings cards, rows with a status badge and a switch, or the same panel more than once), plan and tasks MUST extract one React component and reuse it. The component MUST keep the prototype's element order and class roles: for a settings card, `panel-card`, `section-label`, `h5`, muted text, `<hr class="my-4">` between items, then a row with the label, a status badge, help text, and the switch on the right. Style it with theme tokens. Literal colors are forbidden. Add a `fidelity-map.json` pair for that component covering computed `border`, `border-radius`, `box-shadow`, `padding`, `font-family`, `font-size`, `font-weight`, `color`, and `background`. `scripts/check-settings-card.mjs` inside `pnpm lint` fails a card that drops the `<hr>`, omits `box-shadow` from the map, or uses a hex color. `/speckit.analyze` MUST mark **CRITICAL** when a repeated prototype pattern has no reusable component or no such fidelity-map entry.

### Validation Single Source of Truth

Zod schemas in `packages/contracts` are the ONLY validation source:
- Validate on BOTH frontend and backend
- Request schemas strict; response schemas strip unknown
- RFC 9457 Problem Details for errors
