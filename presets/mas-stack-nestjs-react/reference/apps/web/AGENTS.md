# Web — {{nombre-del-producto}}

Cada feature de `{{modulos}}` vive en `apps/web/src/features/{{feature}}/`.
La ruta es lazy (`mas/lazy-feature-routes`).
El fetch vive en la capa data (`mas/fetch-in-feature-data`).
Los tipos salen de `{{scope-contracts}}`. No los redeclarés.

Formularios con `react-hook-form` y zod (`mas/no-manual-form-errors`).
Gráficos con Recharts. Fechas con `date-fns`.
Están en `.specify/presets/mas-stack-nestjs-react/templates/approved-libraries.md`.
El esqueleto aún no las pone en `apps/web/package.json`.
No las importes hasta agregarlas desde el lockfile. No elijas la versión a ojo.

Los textos pasan por `t()` (`mas/no-literal-copy`).
Un componente con lógica lleva test de Testing Library (`scripts/check-component-tests.mjs`).
La historia de usuario lleva e2e de Playwright con axe.

## Seguridad

`dangerouslySetInnerHTML` solo con DOMPurify (`mas/no-dangerous-html-unsanitized`).
La sesión va en cookie httpOnly. No guardes tokens en `localStorage`.
Ocultar un botón no autoriza: el permiso lo decide la API.
Ningún `VITE_` lleva clave, secreto ni token (`mas/no-secret-in-client`).
Detalle: `.specify/memory/security-guidelines.md`.

## Performance

Importá en dinámico las librerías pesadas.
Pedí una página a la API. No descargues el listado entero.
Las variantes de imagen llevan `loading=lazy`. Un filtro al servidor usa debounce.
La skill `vercel-react-best-practices` está en `.specify/presets/mas-stack-nestjs-react/stack-skills.yml`.
Si el init usó `--skip-external-skills`, esa carpeta no está. No inventes la ruta.

## Maqueta

La fuente visual es `{{docs/maqueta/<pantalla>.html}}`.
Respetá textos, orden, columnas, filtros, estado vacío y acciones.
El mapa `{{specs/<feature>/fidelity-map.json}}` es obligatorio si hay maqueta (`pnpm test:fidelity`).
Lo que no se implementa queda en la spec, con el motivo.
Usá tokens y `packages/ui`. No copies el CSS de la maqueta.
Color e icono: `mas/no-literal-color` y `mas/icon-library`.
Criterio completo: `.specify/memory/constitution.md`.
