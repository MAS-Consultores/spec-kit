---
name: clean-code-typescript
description: Reglas de Clean Code en TypeScript que el linter no puede medir. Cargada por /speckit.implement y /speckit.converge.
license: MIT
source: https://github.com/ertugrul-dmr/clean-code-skills/tree/main/skills/typescript
---

# clean-code-typescript

Adaptación de `ertugrul-dmr/clean-code-skills` (`skills/typescript`), licencia MIT. Copyright de los autores originales. Este archivo no copia el catálogo completo: solo lo que no miden ESLint, knip ni jscpd.

## Qué sí se aplica

- **N7.** El nombre en inglés dice el efecto. `getConfig` no escribe. `revokeSessions` sí revoca.
- **F3.** Sin parámetros booleanos de modo. Dos funciones en vez de `render(isTest: boolean)`.
- **G36.** Ley de Demeter. Un colaborador no atraviesa `a.b.c.d` para decidir. Pide el dato al dueño.
- **Guard clauses.** Salida temprana cuando el caso no aplica. El camino feliz queda al final, sin `else` anidado.
- **T5.** Tests de bordes: vacío, cero, uno, el límite y el de justo después. El camino feliz no alcanza.

`/speckit.analyze` y `/speckit.converge` reportan estas violaciones con el código (N7, F3, G36, T5) y las corrigen antes de terminar. Lo medible se reporta con su regla: F1 (`mas/max-callable-params`), G5 (jscpd y `sonarjs/no-identical-functions`), G25 (`no-magic-numbers`), G30 (`sonarjs/cognitive-complexity`, `max-lines-per-function`), C5 (`mas/no-commented-code`), G9 (knip).

## Qué no se exige

- **G23** (polimorfismo en vez de if/else) queda como sugerencia. No bloquea el merge.
- **T9** (tests de menos de 100 ms) solo se menciona para tests unitarios. No es un gate.
- Comentarios al estilo Java (C1–C4, J1–J3) no se portan. La única regla de comentarios que bloquea es C5, y solo en código nuevo (warn en lo ya existente).

## Adopción

El código que ya estaba en el esqueleto puede advertir (`warn`). El código nuevo o modificado entra en error el mismo día, por el diff del PR (`scripts/check-diff-quality.mjs`). El paso a error total está en `docs/quality-loop.md`.
