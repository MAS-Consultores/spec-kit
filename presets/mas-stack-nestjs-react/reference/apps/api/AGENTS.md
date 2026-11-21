# API — {{nombre-del-producto}}

Un módulo de `{{modulos}}` vive en `apps/api/src/modules/{{modulo}}/`.
Capas: controller delgado, luego service, luego repository.
Prisma solo en el repository y en el módulo Prisma.
Lo cortan `mas/thin-controllers` y `mas/prisma-only-in-repositories`.
No importes el interior de otro módulo: entrá por su `index.ts`.
Lo cortan `mas/public-module-api` y `no-foreign-module-internals`.
Reutilizá el módulo común antes de crear otro.

Guías, sin copiarlas:

- `.specify/presets/mas-stack-nestjs-react/templates/common-modules/tabular-import.md`
- `.specify/presets/mas-stack-nestjs-react/templates/common-modules/file-upload.md`
- `.specify/presets/mas-stack-nestjs-react/templates/common-modules/mail.md`

El service no llama a `Date.now()`, `new Date()` sin argumento ni `Math.random()`.
Inyectá Clock e IdGenerator desde `apps/api/src/modules/platform`.
`mas/no-hidden-service-deps` avisa en lo viejo y falla en el diff (`scripts/check-diff-quality.mjs`).
Imágenes PNG o JPG con `file-type` y `sharp`. No sirvas el original.
Logs con `nestjs-pino` (`no-console`). Correo en MJML (`mas/no-handmade-email-html`).
El test del service es un spec al lado. El e2e vive en `apps/api/test`.

## Seguridad

Cada handler lleva `@Public()`, `@Authenticated()` o `@Can`.
Un público es `@Public()` y la spec dice por qué. Lo exige `scripts/check-casl.ts` (`pnpm casl`).
Validá la entrada con el DTO de `{{scope-contracts}}`.
Filtrá las filas en el repository. Sin columna tenant.
La autorización es `@casl/ability` 7.1.3, junto a los guards.
Está en `.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`.
El criterio de filas está en `.specify/memory/constitution.md`.
No uses `$queryRawUnsafe`. No hay regla con ese nombre: Prisma sigue en el repository.
Archivos con tipo real y tope: `mas/multipart-upload-limits` y `mas/no-client-file-type-trust`.
No loguees secretos ni datos personales. El redact está en `.specify/memory/security-guidelines.md`.
Argon2id, access token corto y refresh que rota.
Login y recuperación llevan rate limit (`mas/require-throttle-sensitive`).
`helmet()` al arrancar (`mas/require-helmet`). CORS solo si el browser llama al host de la API.
Con el proxy de Vite, `CORS_ORIGIN` queda vacío. El resto: `.specify/memory/constitution.md`.

## Performance

Paginación en el servidor, con tope. El listado lleva `take` y `select` de lo que se responde.
Sin blobs en el listado. Sin N+1. Índice para lo filtrado o lo ordenado.
La carga masiva va por lotes, dentro de una transacción.
El archivo entra por multipart o stream, no en base64 (`mas/no-base64-file-upload`).
El trabajo pesado no va en el request. Colas y cron siguen pendientes: no des ninguna por aprobada.
Lista: `.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`.
