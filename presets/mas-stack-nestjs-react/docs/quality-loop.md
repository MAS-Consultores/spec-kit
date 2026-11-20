# Quality loop y trinquete

Aplica a `/speckit.converge` y a cualquier agente que corrija bugs sobre este stack.

## Loop

Después de implementar, y después de cada ronda de corrección, sobre lo que cambió:

1. `pnpm lint` (reglas clean code, capas, knip, jscpd vía el trinquete, dependency-cruiser, fixtures).
2. Si hay hallazgos nuevos, el agente los corrige y vuelve a correr el loop.
3. Máximo 3 vueltas.
4. Solo se termina con cero hallazgos nuevos, o con cada excepción escrita en el reporte de converge: archivo, regla y motivo.

El mismo loop vale para un agente que solo arregla un bug. No se declara el arreglo listo con un hallazgo nuevo sin esa excepción.

## Trinquete

`quality-baseline.json` versiona los conteos por regla y archivo (warnings de código existente), los clones de jscpd y los hallazgos de knip. El CI falla si algo sube. Si baja, el mismo PR actualiza la baseline con `node scripts/check-quality-baseline.mjs --update`. Un archivo que el PR toca queda igual o mejor.

## Error en código nuevo

`no-magic-numbers` y `mas/no-commented-code` están en `warn` para el árbol actual. `scripts/check-diff-quality.mjs` los trata como error en las líneas que el diff agrega (`DIFF_BASE`, por defecto `HEAD`).

## Paso a error total

Cuando la baseline de esas dos reglas llegue a cero en todos los archivos:

1. En `eslint.config.js`, cambia `"warn"` por `"error"` en `no-magic-numbers` y `mas/no-commented-code`.
2. Quita esas reglas de `ADOPTION_RULES` en `scripts/check-diff-quality.mjs`.
3. Borra sus mapas de `quality-baseline.json`.
4. Deja el resto del loop igual.

Hasta ese día el diff sigue siendo el gate del código nuevo.
