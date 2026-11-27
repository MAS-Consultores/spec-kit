---
description: NestJS + React completion gate on top of MAS implement.
strategy: wrap
---

## Reference skeleton

Implement by copying `.specify/reference/` and adapting it to the feature.
Do not recreate auth, Prisma, MCP, shadcn, or the Playwright health check
from memory when that tree is present.

## NestJS + React completion gate

Do not declare the feature finished, and do not merge, until these suites have been executed and their output is in the report:

- API e2e: supertest against the SWC build (`start:e2e`) and real Postgres. At least one test per REST endpoint, including 401, CASL 403, refresh-token rotation, and throttling 429.
- MCP e2e: Bearer and scopes against that Postgres. At least one test per MCP tool.
- Playwright with axe-core: at least one spec per user story. `screenshot`, `video`, and `trace` stay `'off'`. When the feature adds login and more than one locale, run the spec copied from `.specify/reference/templates/i18n-login.spec.ts`.
- When the prototype repeats a settings card or a badge-and-switch row, the reusable component matches that structure and `pnpm test:fidelity` covers its computed border, radius, shadow, padding, typography, and colors. `pnpm lint` (`scripts/check-settings-card.mjs`, `mas/no-literal-color`) stays at 0.
- When `spec.md` ports an HTML prototype, follow **Prototype fidelity** in the stack constitution: tokens from `prototype-tokens.json`, copied brand assets (never a text logo), literal motion with `prefers-reduced-motion`, and the shell design (header, rail, widths, gradients, collapsed and mobile). Scaffolding (CDN, jQuery, icon CDN scripts, sim-bar, scripts) stays out. Use the prototype's icon library through `apps/web/ui.icons.json` and `apps/web/src/icons/index.ts`, with `data-icon` on each glyph. Do not substitute `lucide-react` when the prototype names another library. Keep literal colors out of components and out of CSS other than `apps/web/src/index.css`. `pnpm lint` is the primary gate. Run `pnpm test:fidelity` against `specs/<feature>/fidelity-map.json` (computed color, hover, active, `data-icon`, axe `color-contrast`). Do not finish while it fails. The command never takes a screenshot, video, or trace.
- Unit tests for each domain service, guard, and CASL policy.

A run that only has a few unit tests and a single Playwright spec does not meet the gate.

## Modularidad estricta

Follow **Formatos estándar** in the stack constitution and read `.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`. Use `exceljs` for xlsx, `csv-parse` for CSV, Playwright `page.pdf()` to generate a PDF from HTML, `pdf-lib` to merge or stamp, and `unpdf` to extract text. Do not import `xlsx`, do not hand-write a PDF, and do not finish while `mas/no-handrolled-format-parsers` fails. For ZIP or XML, use only the library the plan consulted or justified.

Follow **Librerías de producto** in the stack constitution and `approved-libraries.md`. Keep `pnpm lint` at 0, including `scripts/check-mjml.mjs` (`validationLevel: 'strict'`). Do not add BullMQ unless the plan justifies it while the queue decision is still open. Do not add `ffprobe` or `fluent-ffmpeg`. Do not finish while `mas/no-regex-html-sanitize`, `mas/no-dangerous-html-unsanitized`, `mas/no-handmade-email-html`, `mas/no-client-file-type-trust`, `mas/no-direct-llm-fetch`, `mas/no-secret-in-client`, `mas/no-raw-process-env`, `mas/require-throttle-sensitive`, `mas/require-helmet`, `mas/no-manual-form-errors`, `mas/reduced-motion-animations`, or `no-console` in `apps/api` fails. Warnings `mas/no-timer-scheduling`, `mas/no-handmade-charts`, and `mas/no-manual-date-math` must be resolved or suppressed with a justification.

Follow **Subida de archivos** in the stack constitution. Uploads use multipart with `limits.fileSize` and a type or magic-byte validator. Do not finish while `mas/multipart-upload-limits`, `mas/no-base64-file-upload`, or `mas/base64-upload-max-length` fails.

Follow **Bitácora de actividad** in the stack constitution. Each mutating handler uses `@Audit('event.key')` with a catalog key, or `@NoAudit('motivo')` when the spec records that exception. Do not finish while `mas/require-audit-on-mutations` fails.

Follow **Modularidad estricta** in the stack constitution. New domains come from `pnpm gen:module <dominio>`. Do not register a domain by editing another domain. `pnpm lint` must stay at 0.

Follow **Migraciones seguras sobre datos existentes**. Do not edit a migration that is already on the base branch. Add a new migration. Do not add `NOT NULL` without `DEFAULT` or a backfill, and do not `UPDATE` a column to NULL while it is still `NOT NULL`. Destructive SQL needs `-- mas:allow-destructive <motivo>`. `pnpm db:seed` does not deploy production.

## Clean code y quality loop

Read `.specify/presets/mas-stack-nestjs-react/skills/clean-code-typescript/SKILL.md` before editing. Names in English state the effect (N7). No boolean mode parameters (F3). Law of Demeter (G36). Guard clauses. Boundary tests (T5). Do not block on polymorphism instead of if/else (G23, suggestion only). The 100 ms test budget (T9) is a note for unit tests only.

Two lint loops:

- Fast, on the files you touched: `pnpm exec oxlint` (under 200 ms).
- When the task closes: ESLint on those files, then `pnpm verify`. CI does the same.

Each feature marks at least its main flow with `@critical`.

After this phase, and after every fix round, run the quality loop in `.specify/presets/mas-stack-nestjs-react/docs/quality-loop.md`: lint (clean code and layers), knip, jscpd, dependency-cruiser. Fix and repeat, at most 3 rounds. Finish only with no new findings, or with each exception written down (file, rule, reason). A bugfix agent uses the same loop.

Before implement finishes, run `node scripts/check-spec-traceability.mjs`. Each acceptance id in `specs/*/spec.md` needs a test that names it or comments `// covers: AC-01`. A cited id that the spec does not declare fails the check.

When implement closes, recommend that the developer open a pull request in the format of `.github/pull_request_template.md`. Until the developer accepts, do not push and do not open the pull request. When the developer accepts, create and publish it yourself and never merge it. Fill **Qué y por qué** and **Fuera de alcance** from `spec.md`, **Riesgos/rollback** from `plan.md`, completed tasks from `tasks.md`, and **Cómo se validó** with the `check-hygiene` output. The base branch is `testing` when it exists. Run `pnpm metrics` to read the top and the weekly trend from the `metrics` branch (`git fetch origin metrics`). Do not commit `docs/metrics/runs.jsonl` or `.specify/telemetry/runs.jsonl`; both are gitignored on work branches and on main or master. The weekly workflow publishes them on `metrics`. `docs/metrics/harness.md` in the tree is a template. Run `pnpm metrics:pr` and paste its lint table (rules and files) into the pull request body. The rows come from `.specify/telemetry/runs.jsonl`. Do not dodge a gate. `scripts/check-gate-gaming.mjs` fails the diff when a disable, a skipped test, a lower threshold, a new ignore, or a split `process.env` name is added. Fix the cause. An exception belongs in the pull request body under `## Excepciones de gates`, with the file and the reason.

`no-magic-numbers` is error. New and modified lines are also error for `mas/no-commented-code` and `mas/no-hidden-service-deps` via `scripts/check-diff-quality.mjs` while those two stay warn on existing code. Services inject `Clock` and `IdGenerator` from `modules/platform`. A web component past the complexity threshold needs a Testing Library `*.test.tsx`.

## Lint the agent must keep green

`eslint.config.js` is flat config. Do not add `.eslintrc.cjs`.

- `eslint-plugin-boundaries`: `apps/api` and `apps/web` never import each other; `apps/api` does not import `@demo/ui`; `packages/contracts` imports no app. Shared types and schemas go in `packages/contracts`. Keep `madge` for cycles.
- Controllers and MCP tools never touch Prisma (`PrismaClient`, `@prisma/client`, the generated client, `PrismaService`). Queries go to the domain service.
- Read `process.env` and `requiredEnv` only in `apps/api/src/config` (Nest `ConfigModule` with Zod). Add the variable to that module and `.env.example`, then inject `ConfigService`. `prisma.config.ts`, `prisma/database-url.ts`, scripts, and e2e configs (including `vite.config.ts` for `API_PROXY_TARGET`) may still read the environment.
- Do not add `useEffect` outside `apps/web/src/shared/hooks/**`. Server state goes through TanStack Query.
- Do not add `eslint-disable` without a justification or ticket after `--`. Do not add `@ts-ignore` or `@ts-expect-error` without a description. Disabling `no-explicit-any` is forbidden outright.

{CORE_TEMPLATE}
