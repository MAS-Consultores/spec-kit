---
description: NestJS + React planning requirements on top of MAS planning.
strategy: wrap
---

## NestJS + React Planning Requirements

Resolve contradictions between `spec.md` and `.specify/memory/stack-context.md` inside `MAS Stack Validation` before writing design artifacts.

Locale rule: stack context does not override the spec. If the spec says es-CL is the only required locale, plan only `locales/es-CL.json` and do not add `en.json` or a language switcher. Record the decision as `PASS` with that note. Add `en` only when the spec requires it.

`quickstart.md` commands MUST use `pnpm --filter` with the `name` from each workspace `package.json` (for example `@demo/api` and `@demo/web`). Do not use the directory names `api` or `web` unless that string is the package name.

State `apps/api/prisma.config.ts` at the package root, `queryClient.query` in loaders, source-only `packages/ui`, and the auth design (HttpOnly cookies, CSRF, rotating refresh with reuse detection, Argon2id, CASL) even when the feature spec only assumes a logged-in user.

{CORE_TEMPLATE}
