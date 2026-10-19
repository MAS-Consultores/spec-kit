---
description: Assess remaining work and append tasks without breaking MAS language policy.
strategy: wrap
---

## MAS Language Policy Requirements

Before executing the core convergence workflow, read:

- `.specify/memory/language-policy.md`
- `artifact_language` and `product_locale` from `.specify/init-options.json` when present

Apply these rules when updating `tasks.md` or any other persisted artifact:

- **Conversation**: Match the user's language for questions, summaries, and status updates.
- **Persisted artifacts**: Write new or updated task text in English only.
- **User-facing copy**: Keep product-locale strings in the spec's `## User-Facing Copy`
  section. Do not move localized UI text into English task descriptions.
- **Identifiers**: Keep task IDs, paths, and technical identifiers in English.

If `.specify/memory/language-policy.md` is missing, default to `artifact_language: en`
and `product_locale: es-ES`.

{CORE_TEMPLATE}
