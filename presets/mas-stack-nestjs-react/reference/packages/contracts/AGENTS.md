# Contracts — {{nombre-del-producto}}

`packages/contracts` es la única fuente de tipos de `{{modulos}}`.
El scope publicado es `{{scope-contracts}}`.
No uses `any`.
Lo corta `@typescript-eslint/no-explicit-any`.

Exportá solo por el index público del dominio.
Lo corta `mas/contracts-public-index`.
Otro paquete no importa un archivo interno.

Un cambio incompatible actualiza las dos apps en el mismo pull request.

- Tocá `apps/api` si el server usa el tipo.
- Tocá `apps/web` si la pantalla usa el tipo.
- No dejes una app en un pull request aparte.

Después de editar, compilá el paquete antes de typecheck.
`pnpm verify` ya empieza por ese build.

El DTO de respuesta no lleva campos internos.
Fuera: hash, secreto, token e id de sesión.
La lista está en `.specify/memory/security-guidelines.md`.

Un listado responde con esta forma:

- `items`
- `total`
- `page`

La constitución pide paginación en el servidor.
El tope y el `take` se aplican en la API, no en este paquete.
El texto está en `.specify/memory/constitution.md`.
