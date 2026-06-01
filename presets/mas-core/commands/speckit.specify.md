---
description: Create or update MAS feature specifications with language policy.
strategy: wrap
---

## MAS Language Policy Requirements

Before executing the core specification workflow, read:

- `.specify/memory/language-policy.md`
- `artifact_language` and `product_locale` from `.specify/init-options.json` when present

Apply these rules throughout:

- **Conversation**: Match the user's language for questions, summaries, and status updates.
- **Persisted artifacts**: Write and update `spec.md` in English only (requirements, user
  stories, acceptance criteria, functional requirements).
- **User-facing copy**: Capture product-locale strings literally in the spec's
  `## User-Facing Copy` section; do not embed localized UI text inside English
  requirement paragraphs.
- **Identifiers**: Use English branch short names and technical identifiers.

When the user describes the feature in another language, translate faithfully into
English for the spec. If meaning is ambiguous, ask clarifying questions in the user's
language, then record the resolved requirement in English.

If `.specify/memory/language-policy.md` is missing, default to `artifact_language: en`
and `product_locale: es-ES`.

{CORE_TEMPLATE}
