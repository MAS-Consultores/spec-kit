---
description: NestJS + React planning requirements on top of MAS planning.
strategy: wrap
---

## Reference skeleton

Copy and adapt `.specify/reference/` (the canonical NestJS + React monorepo),
including its `package.json` files and `pnpm-lock.yaml`. Do not invent a second
Prisma, auth, MCP, or shadcn layout and do not resolve new versions.

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

## NestJS + React Planning Requirements

Resolve contradictions between `spec.md` and `.specify/memory/stack-context.md` inside `MAS Stack Validation` before writing design artifacts.

Locale rule: stack context does not override the spec. If the spec says es-CL is the only required locale, plan only `locales/es-CL.json` and do not add `en.json` or a language switcher. Record the decision as `PASS` with that note. Add `en`, `pt-BR`, or `fr-FR` only when the spec requires them.

When the feature has more than one locale, a language switcher, or translated product copy, `plan.md` MUST follow **Locale resolution** in the stack constitution. Plan `apps/web/src/i18n/locale.ts` (person preference, then the `locale` cookie, then the browser, then the organization default), `changeLanguage` only in a handler or in a guarded effect, keys stored for navigation and translated during render, and `pnpm lint` as the gate (`mas/no-i18n-mutation-in-render`, `mas/no-module-translation`, `mas/no-literal-copy`, `scripts/check-i18n.mjs`). Do not plan calling `i18n.changeLanguage` during render.

`quickstart.md` commands MUST use `pnpm --filter` with the `name` from each workspace `package.json` (for example `@demo/api` and `@demo/web`). Do not use the directory names `api` or `web` unless that string is the package name. `quickstart.md` MUST include `pnpm dev` from the repo root, which loads the root `.env` and starts the API and the web app together.

The plan MUST follow **Migraciones seguras sobre datos existentes** in the stack constitution. Every migration MUST apply on a database that already has rows. Do not edit a migration that testing or production already applied. Destructive changes use expand/contract and `-- mas:allow-destructive <motivo>`. `pnpm db:seed` is not a deploy step. When `SEED_DATABASE_URL` is unset, `pnpm db:setup` and `pnpm db:seed` use `DATABASE_URL` only for host `127.0.0.1`, `localhost`, or `::1`.

`plan.md` MUST include this checklist. Mark each item covered, or not applicable with a reason:

- [ ] New SQL lives in a new `prisma/migrations/<timestamp>/migration.sql`. No edits to a migration that is already on the base branch
- [ ] `NOT NULL` on an existing table has a `DEFAULT` or an earlier non-null `UPDATE` in that migration. No `UPDATE` assigns NULL before `DROP NOT NULL`
- [ ] `DROP COLUMN`, `DROP TABLE`, renames, and other destructive statements carry `-- mas:allow-destructive <motivo>` and ship as a later contract migration
- [ ] `tasks.md` includes `pnpm lint` (migration lint plus negative fixtures) and the `upgrade-on-data` CI job copied from `.specify/reference/.github/workflows/upgrade-on-data.yml`

The plan MUST follow **Modularidad estricta** in the stack constitution: one Nest module per domain, repository ownership, per-domain contracts and Prisma files, lazy feature routes, and `pnpm gen:module` when a domain is new.

When the feature reads or writes Excel/xlsx, CSV, ZIP, XML, or PDF, read `.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md` (copied with the preset by `specify init --stack nestjs-react`) and follow **Formatos estándar** in the stack constitution. Plan `exceljs` for streaming xlsx reads and xlsx writes. Do not plan the npm package `xlsx` (SheetJS) or `typed-xlsx` for import. Plan `csv-parse` for CSV. Plan Playwright/Chromium `page.pdf()` to generate a PDF from HTML or templates, `pdf-lib` to merge, fill forms, or stamp, and `unpdf` to extract text. Do not plan a hand-written PDF (`%PDF-`, xref, trailer, startxref, obj/endobj). ZIP and XML have no approved library: the plan consults or justifies one and does not invent an approval. Do not plan a hand-rolled parser, a sheet-XML regex, a CSV `.split`, or `zlib` inflate/unzip/gunzip. `pnpm lint` enforces `mas/no-handrolled-format-parsers`.

Read `.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md` before adding a library. Charts use Recharts (d3-sankey only for a Sankey; heatmaps are an accessible table). Dates use date-fns, `@date-fns/tz`, and react-day-picker. Forms use react-hook-form and zod. HTML is sanitized with DOMPurify or isomorphic-dompurify / sanitize-html. Email is a `.mjml` template compiled with `mjml2html` at `validationLevel: 'strict'`, interpolated with escaped Handlebars `{{ }}` (not react-email). Do not plan `moment`, `dayjs`, `chart.js`, `react-chartjs-2`, `echarts`, `socket.io`, or `ws` unless the constitution allows a justified suppression. Queues, cron, and background jobs are pending a decision (BullMQ+Redis or pg-boss on Postgres): the plan MUST justify the chosen mechanism and MUST NOT treat BullMQ as already approved. Video uploads are limited by `limits.fileSize` (for example 100 MB) and `file-type`; do not plan `ffprobe`, `fluent-ffmpeg`, or a server-side duration check. Image uploads accept only PNG and JPG (`file-type`), then `sharp` rotates from EXIF, strips metadata, center-crops (`fit: 'cover'`, `position: 'centre'`), and writes fixed variants (avatar 128 and 512, banner 1600x500, cover 1280x720) as JPEG or WebP at quality 80. The browser never receives the original. Plan a test of dimensions, orientation, and removed EXIF. Copy `apps/api/src/images/normalize-image.ts`. Dates are stored in UTC with the organization time zone. A dashboard print route plans a non-empty PDF with Recharts `isAnimationActive={false}`. Every new route plans axe. `apps/api/src/main.ts` plans `helmet()`, sensitive routes plan `@Throttle` or `SensitiveThrottle`, and API logs plan `nestjs-pino`.

When the feature uploads a file, `plan.md` MUST follow **Subida de archivos** in the stack constitution. Plan `multipart/form-data` with `FileInterceptor`, `FilesInterceptor`, `FileFieldsInterceptor`, or `AnyFilesInterceptor`, `limits.fileSize`, and a type check (`fileFilter`, or `ParseFilePipe` with `FileTypeValidator` / a magic-byte validator). Do not plan JSON base64 (`@IsBase64`, `fileContent`, `dataUrl`, a `data:` URI, or `Buffer.from(..., "base64")`) unless the base64 string is capped at 1 MiB (`@MaxLength(1048576)` or `z.string().max(1048576)`) and the line carries `// eslint-disable-next-line mas/no-base64-file-upload -- <motivo>`. `pnpm lint` enforces `mas/multipart-upload-limits`, `mas/no-base64-file-upload`, and `mas/base64-upload-max-length`.

When the spec ports an HTML prototype, the plan MUST follow **Prototype fidelity** in the stack constitution. Plan the token file, the brand manifest, self-hosted fonts, literal motion, and the shell design. Do not plan porting CDN, jQuery, sim-bar, or prototype scripts. Do not plan a text logo or skeleton default colors when the prototype defines the value. Plan `pnpm test:fidelity` on `specs/<feature>/fidelity-map.json`.

When the prototype repeats a pattern (settings cards, rows with a badge and a switch), the plan MUST name one reusable component that keeps the prototype element order (`panel-card`, `section-label`, `h5`, muted text, `hr.my-4`, label, badge, help, switch on the right) and tokens instead of literal colors. The fidelity map for that component MUST list computed `border`, `border-radius`, `box-shadow`, `padding`, `font-family`, `font-size`, `font-weight`, `color`, and `background`.

When the prototype uses an icon library, `plan.md` MUST name that same library and those glyphs, and MUST set `apps/web/ui.icons.json` (`library` is the official npm package, `module` is `apps/web/src/icons/index.ts`). Plan per-icon imports inside that module only. Do not plan a CDN script. Do not plan `lucide-react` when the prototype names another library. `lucide-react` is the fallback only when the prototype defines no icons. Plan `data-icon` on each ported glyph. `pnpm lint` (`mas/icon-library`, `mas/no-literal-color`, `scripts/check-colors.mjs`) is the primary gate for icons and colors.

State `apps/api/prisma.config.ts` at the package root, `queryClient.query` in loaders, source-only `packages/ui`, and the auth design (HttpOnly cookies, CSRF, rotating refresh with reuse detection, Argon2id, CASL) even when the feature spec only assumes a logged-in user.

When the feature includes authentication (login, account recovery, one-time passwords or tokens, session issuance, password change, or mail that carries auth secrets), `plan.md` MUST include this checklist. Mark each item covered, or not applicable with a reason:

- [ ] One-time passwords and tokens are single-use: consumed atomically on first success and invalidated by any later successful login or password change
- [ ] Account recovery and login never reveal account existence or why a login was rejected: same status, body, and similar latency; every rejection path pays the Argon2 cost (stored Argon2id hash when one exists, otherwise a fixed dummy Argon2id hash with the same parameters as real hashes, including missing account, missing credential, inactive, locked or blocked, and any other 401 that does not verify a real hash); hashing, database writes, and email cannot change the response
- [ ] Lockout and rate-limit counters update in one transaction (per-key lock or atomic upsert-increment): never read-then-write, never count-then-insert, reject inside the transaction, purge expired rows in that transaction, and include a concurrency test
- [ ] Client IP for audit and rate limits comes from `request.ip`; `X-Forwarded-For` is trusted only through an explicit configured trust-proxy setting, and values are validated
- [ ] A session that must change its password, or is otherwise restricted, carries no business scopes; guards allow only change-password, logout, and me; refresh does not reissue scopes
- [ ] Outbound SMTP that carries secrets requires TLS (`secure` or `requireTLS`); plaintext only for a loopback dev mail catcher
- [ ] Password change and session revocation invalidate existing access tokens and refresh tokens (reject tokens issued before `passwordChangedAt` or an older token version; refresh checks before issuing)
- [ ] Guard bypasses compare the parsed path only and never use `originalUrl.includes` or `url.includes`
- [ ] Tests cover every rule that applies

`plan.md` MUST include a section titled **Eventos de bitácora**. For each event in the spec, name where it is recorded: the Nest handler, `@Audit('event.key')` (or `@NoAudit('motivo')` with the spec's reason), the catalog entry, and the write in the same transaction as the business change. Metadata MUST omit passwords, hashes, and tokens. Pure reads are not planned as audit events unless the spec lists them.

Do not plan an example slice. The reference has no notes or widgets module, no demonstration screen, and no `example.com` seed. Identity tables in the skeleton are generic auth infrastructure and stay empty until a feature defines accounts. Domain models, screens, and seeds come from the feature spec.

Database names stay English. Prisma models are PascalCase singular. Physical tables are snake_case plural through `@@map` and physical columns are snake_case through `@map`. Do not plan Spanglish identifiers or Spanish enum values in the schema. A field that must match an external source system 1:1 may keep that source name on the model; its column is still snake_case and the plan records the exception.

Record the Active Node LTS resolved from `https://nodejs.org/dist/index.json` (first entry whose `lts` is not false): exact version for `.nvmrc`, that major for `engines` / `@types/node` / CI / Docker / README. Do not copy a Node version from memory. Corepack setup is `npm i -g corepack@latest && corepack enable` because Node 25+ does not bundle it.

{CORE_TEMPLATE}
