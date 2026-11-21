---
description: Cierra la feature con el quality loop del stack NestJS + React.
---

# /speckit.converge

Lee `skills/clean-code-typescript/SKILL.md` y `docs/quality-loop.md` de este preset.

## Reporte

Antes de dar la feature por terminada, lista cada violación con su código: F1, F3, G5, G30, G36, N7, C5, T5, y la regla ESLint cuando exista (`mas/max-callable-params`, `sonarjs/cognitive-complexity`, `no-magic-numbers`, `sonarjs/no-identical-functions`, `mas/no-commented-code`, `mas/no-hidden-service-deps`). Corrígelas. G23 es sugerencia y no bloquea. T9 solo se menciona en tests unitarios.

## Quality loop

Dos bucles de lint. El rápido, sobre los archivos tocados: `pnpm exec oxlint` (menos de 200 ms). Al cerrar la tarea: ESLint sobre esos archivos y después `pnpm verify`. El CI hace lo mismo.

Tras implementar y tras cada ronda de corrección, corre sobre lo cambiado: lint (clean code y capas), knip, jscpd y dependency-cruiser. Si hay hallazgos, corrige y repite, hasta 3 vueltas. Termina solo con cero hallazgos nuevos o con cada excepción justificada en este reporte (archivo, regla, motivo).

Cada feature marca al menos su flujo principal con `@critical`.

Al cerrar, el pull request lleva una tabla corta: gate, vueltas y reglas corregidas, a partir de `.specify/telemetry/runs.jsonl`.

Un agente que corrige un bug usa el mismo loop. No hace falta una feature nueva para eso.

## Gates que el loop no reemplaza

- Cobertura del diff ≥ 80 % en líneas y ramas (`scripts/check-diff-coverage.mjs` sobre el lcov de `vitest --coverage`). Sin umbral global.
- Componente web con lógica (3 o más condicionales) y su `*.test.tsx` de Testing Library.
- Services sin `Date.now()`, `new Date()` sin argumento, `Math.random()` ni `new` de clases con efectos. Clock e IdGenerator salen de `modules/platform`.
- `tsconfig` strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, y `typescript-eslint/strictTypeChecked`.
- gitleaks en el CI del PR.

El trinquete (`quality-baseline.json`) no puede subir. Si baja, actualízalo en el mismo cambio.
