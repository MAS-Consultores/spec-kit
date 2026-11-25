# {{nombre-del-producto}}

Este repo es un monorepo de tres piezas.

- `apps/api`: NestJS y Prisma.
- `apps/web`: React y Vite.
- `packages/contracts`: tipos compartidos.

El scope de contratos es `{{scope-contracts}}`.
Los módulos de producto son `{{modulos}}`.
No inventes otro scope ni otro módulo.

## Cómo entra el trabajo

Una feature nueva entra solo por Spec Kit.

- Primero `/speckit.specify`.
- Después `/speckit.plan`.
- Después `/speckit.tasks`.
- Al final `/speckit.implement`.

No ejecutes `/speckit.constitution`.
La constitución ya está ratificada.
Está en `.specify/memory/constitution.md`.

Flujo de ramas, configurable por el producto:

- La rama de trabajo es `{{prefijo-de-feature}}/{{nombre-corto}}`.
- El pull request apunta a `{{rama-de-integracion}}`.
- No mergees ese pull request.
- El merge lo hace una persona, no el agente.

## Commits

Cada commit y el título del pull request siguen Conventional Commits 1.0.0
(https://www.conventionalcommits.org/en/v1.0.0/):

`<tipo>[ámbito opcional][!]: <descripción>`

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
La descripción va en imperativo, sin punto final, y el encabezado no pasa de 100 caracteres.
Un cambio que rompe compatibilidad lleva `!` o un pie `BREAKING CHANGE:`.
Excepciones: mensajes generados por git que empiezan por `Merge ` o `Revert "`.
Un commit que no cumple es un bloqueo.

Ejemplos:

- `feat(api): agregar alta de usuarios`
- `fix(web): corregir el proxy de /api`
- `docs(spec): specify login`

## Comandos

`pnpm dev` levanta la API y la web.
El script es `scripts/dev.mjs`.
`pnpm verify` recorre `pnpm lint:fast` (oxlint sobre el árbol) y después lint, tipos, tests y los gates.
Verify en verde y el CI en verde son la definición de listo.
La cobertura del diff es `scripts/check-diff-coverage.mjs`.
Sin lcov ese gate sale distinto de cero.

Dos bucles de lint:

- El rápido, sobre los archivos tocados: `pnpm exec oxlint` (menos de 200 ms).
- Al cerrar cada tarea: ESLint sobre los tocados y después `pnpm verify`. El CI hace lo mismo.

Cada feature marca al menos su flujo principal con `@critical` en Playwright.

## No negociable

Solo librerías de esta lista:
`.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`.
Si no está ahí, no la agregues.
La autorización de la API es `@casl/ability` 7.1.3, junto a los guards.

No desactives una regla `mas/*`.
No subas un conteo de `quality-baseline.json`.
Si un conteo baja, actualizalo en el mismo pull request.
En el diff, las reglas de adopción son error.
El script es `scripts/check-diff-quality.mjs`.

En código nuevo, el lint ya corta estos límites:

- `mas/max-callable-params`
- `sonarjs/cognitive-complexity`
- `max-lines-per-function`

Líneas y ramas nuevas: 80 %.
No hay umbral global.

## Seguridad

No dejes secretos en el árbol.
El workflow `.github/workflows/gitleaks.yml` los rechaza.
Cada variable leída está en `.env.example`.
Lo exige `scripts/check-env-example.mjs`.
No entres a servidores ni a bases que no sean el Postgres local.

## Dónde mirar

No copies estas guías. Abrí la que toque el cambio.

- Constitución: `.specify/memory/constitution.md`
- Contexto: `.specify/memory/stack-context.md`
- Seguridad: `.specify/memory/security-guidelines.md`
- Librerías: `.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`
- Tabular: `.specify/presets/mas-stack-nestjs-react/templates/common-modules/tabular-import.md`
- Archivos: `.specify/presets/mas-stack-nestjs-react/templates/common-modules/file-upload.md`
- Correo: `.specify/presets/mas-stack-nestjs-react/templates/common-modules/mail.md`

El detalle de cada paquete está en estos tres archivos:

- `apps/api/AGENTS.md`
- `apps/web/AGENTS.md`
- `packages/contracts/AGENTS.md`
