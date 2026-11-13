---
description: Clarify MAS specification requirements with language policy.
strategy: wrap
---

## MAS Language Policy Requirements

Before executing the core clarification workflow, read:

- `.specify/memory/language-policy.md`
- `artifact_language` and `product_locale` from `.specify/init-options.json` when present

Apply these rules throughout:

- **Conversation**: Match the user's language for all clarifying questions and summaries.
- **Persisted artifacts**: Write spec updates in English only.
- **User-facing copy**: When clarification reveals UI text, add or update the spec's
  `## User-Facing Copy` section with literal product-locale strings — do not translate
  them into English inside requirement paragraphs.
- **Identifiers**: Keep branch names, keys, and technical identifiers in English.

If `.specify/memory/language-policy.md` is missing, default to `artifact_language: en`
and `product_locale: es-ES`.

## Empty repository commits

`/speckit.clarify` commits spec updates on the current feature branch. When the
repository was born empty, that branch (created by `create-new-feature`) holds
the only commits. `main` may still not exist. Do not move those commits onto
`main` during clarify. `/speckit.analyze` is read-only and does not commit.

{CORE_TEMPLATE}
