# Quality loop y trinquete

Aplica a `/speckit.converge` y a cualquier agente que corrija bugs sobre este stack.

## Loop

Dos bucles:

1. Rápido, sobre los archivos tocados: `pnpm exec oxlint` (menos de 200 ms).
2. Al cerrar cada tarea: ESLint sobre esos archivos y después `pnpm verify`. El CI repite ese cierre.

Después de implementar, y después de cada ronda de corrección, sobre lo que cambió:

1. `pnpm lint` (reglas clean code, capas, knip, jscpd vía el trinquete, dependency-cruiser, fixtures).
2. Si hay hallazgos nuevos, el agente los corrige y vuelve a correr el loop.
3. Máximo 3 vueltas.
4. Solo se termina con cero hallazgos nuevos, o con cada excepción escrita en el reporte de converge: archivo, regla y motivo.

El mismo loop vale para un agente que solo arregla un bug. No se declara el arreglo listo con un hallazgo nuevo sin esa excepción.

## Trinquete

`quality-baseline.json` versiona los conteos por regla y archivo (warnings de código existente), los clones de jscpd y los hallazgos de knip. El CI falla si algo sube. Si baja, el mismo PR actualiza la baseline con `node scripts/check-quality-baseline.mjs --update`. Un archivo que el PR toca queda igual o mejor. `check-gen-fitness` llama a `pnpm lint -- --skip-jscpd-ratchet` porque alpha y beta son dos copias del andamio. Ese flag no está en `pnpm verify` ni en el script `lint`. El trinquete de jscpd del código real sigue activo ahí.

## Error en código nuevo

`no-magic-numbers` está en `error`. `mas/no-commented-code` y `mas/no-hidden-service-deps` están en `warn` para el árbol actual. `scripts/check-diff-quality.mjs` los trata como error en las líneas que el diff agrega. La base del diff es el `merge-base` de `HEAD` con `--base`, o con `GITHUB_BASE_REF`, o con `origin/main` / `origin/master`, o con el primer padre (`HEAD^`). El workflow `.github/workflows/diff-quality.yml` hace checkout con `fetch-depth: 0` para que ese merge-base exista.

`scripts/check-diff-coverage.mjs --self-test` solo prueba el cálculo. El gate del PR es `--gate` (lcov real de `vitest --coverage` y el mismo diff) o `--lcov` junto con `--diff`. Sin esos argumentos el script sale 1. `pnpm lint` corre el self-test. `pnpm verify` y el workflow corren `--gate`.

`scripts/check-component-tests.mjs` recorre `quality-gates.json` → `componentRoots` (por defecto `apps/web/src`). Un directorio que no existe se salta: el gate no exige `apps/web/src/shell`. El script de fitness que pasa `--skip-jscpd-ratchet` se detecta por contenido, o por `jscpdSkipScripts` en `quality-gates.json`, sin fijar el nombre `check-gen-fitness.mjs`. Los ignores de knip propios del producto van en `knip.product.json` (`ignore`, `ignoreDependencies`, `ignoreBinaries`); `scripts/run-knip.mjs` los fusiona con `knip.json`.

## Paso a error total

Cuando la baseline de esas dos reglas llegue a cero en todos los archivos:

1. En `eslint.config.js`, cambia `"warn"` por `"error"` en `mas/no-commented-code` y `mas/no-hidden-service-deps`. `no-magic-numbers` ya es error.
2. Quita esas reglas de `ADOPTION_RULES` en `scripts/check-diff-quality.mjs`.
3. Borra sus mapas de `quality-baseline.json`.
4. Deja el resto del loop igual.

Hasta ese día el diff sigue siendo el gate del código nuevo.
