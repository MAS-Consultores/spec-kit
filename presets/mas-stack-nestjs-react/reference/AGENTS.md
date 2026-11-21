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

## Comandos

`pnpm dev` levanta la API y la web.
El script es `scripts/dev.mjs`.
`pnpm verify` recorre lint, tipos, tests y los gates.
Verify en verde y el CI en verde son la definición de listo.
Después de cada edición corre oxlint sobre esos archivos:
`pnpm exec oxlint <archivos>`.
El árbol entero es `pnpm lint:fast`.
Verify lo corre antes de ESLint.
ESLint sigue siendo el gate.
La cobertura del diff es `scripts/check-diff-coverage.mjs`.
Sin lcov ese gate sale distinto de cero.

## No negociable

Solo librerías de esta lista:
`.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`.
Si no está ahí, no la agregues.

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
