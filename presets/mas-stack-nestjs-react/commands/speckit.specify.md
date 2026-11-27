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
- Scaffolding (CDN, jQuery, icon CDN scripts, sim-bar, scripts) is not ported. Shell design (header, rail, widths, gradients, collapsed and mobile) is ported even when `handoff.md` says the shell is out of scope.
- When the prototype uses an icon library, name that library and the glyphs (for example `fa-solid fa-gauge`). The spec does not switch them for `lucide-react` or another default. `lucide-react` is only the fallback when the prototype defines no icons.

Do not add an example slice to illustrate the map. The map belongs to the feature spec.

## Acceptance ids

Number every acceptance criterion `AC-01`, `AC-02`, and so on. The spec template already shows the shape.

## Eventos de bitácora

`spec.md` MUST include a section titled **Eventos de bitácora**. For each user story or functional requirement that creates, updates, or deletes data, changes configuration, permissions, language, brand, or session, or is a security event (login, failure, lockout, recovery, impersonation), list one row: event key, actor, affected person when one exists, result, and the metadata that is safe to store. Pure reads stay out of the list unless the spec asks for them. An omission is allowed only as an explicit exception with a reason in that section. Every key MUST be a new or existing entry of the audit catalog (`packages/contracts/src/audit/index.ts`): key, i18n key in every declared locale, and tone. The catalog feeds the Actividad type filter. A language change in admin is a state change and MUST appear in this section.

{CORE_TEMPLATE}
