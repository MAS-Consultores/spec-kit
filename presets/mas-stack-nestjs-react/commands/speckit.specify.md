---
description: NestJS + React prototype fidelity requirements on top of MAS specify.
strategy: wrap
---

## Prototype fidelity

Read **Prototype fidelity** and **Modularidad estricta** in the stack constitution before writing `spec.md`. A feature MUST be a new Nest module and a web feature. It MUST NOT add code to `AppModule` beyond one `imports` line, MUST NOT import another module's internals, and MUST NOT put product UI in `packages/ui`.

When the feature ports an HTML prototype, the spec MUST include the map from that section: prototype selector (or `data-testid`) to React `data-testid` to the properties to compare. Also write `specs/<feature>/fidelity-map.json` with the same pairs so `pnpm test:fidelity` can run it.

Record these decisions in the spec:

- Tokens are copied literally from the prototype CSS and the Tailwind CDN config into `prototype-tokens.json`. Skeleton defaults are not acceptable where the prototype sets a value.
- Logos and other brand assets are copied files, never text. Fonts are self-hosted at the same weights. Demo photos and avatars are not copied.
- `@keyframes`, transitions, and easing are copied literally, with `prefers-reduced-motion`.
- Scaffolding (CDN, jQuery, Font Awesome, sim-bar, scripts) is not ported. Shell design (header, rail, widths, gradients, collapsed and mobile) is ported even when `handoff.md` says the shell is out of scope.

Do not add an example slice to illustrate the map. The map belongs to the feature spec.

{CORE_TEMPLATE}
