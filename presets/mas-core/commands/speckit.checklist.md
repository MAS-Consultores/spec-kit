---
description: Generate MAS quality checklists including language policy validation.
strategy: wrap
---

## MAS Language Policy Checklist Requirements

Before executing the core checklist workflow, read:

- `.specify/memory/language-policy.md`
- The feature `spec.md` (especially `## User-Facing Copy` when present)
- `artifact_language` and `product_locale` from `.specify/init-options.json` when present

When generating checklist items, **always include** a **Language Policy** category with
items that validate requirements quality — not implementation behavior:

**Required Language Policy items** (adapt wording to the feature; keep traceability):

- "Are functional requirements, user stories, and acceptance criteria written in English
  (artifact language), not mixed with the user's conversation language? [Language Policy, Completeness]"
- "Is user-facing UI copy captured in a dedicated section (`## User-Facing Copy` in spec,
  or plan language-string tables) rather than embedded untranslated inside English
  requirement paragraphs? [Language Policy, Clarity]"
- "Are literal product-locale strings (buttons, labels, errors, empty states) quoted
  verbatim with locale identified, without being translated into English in the spec?
  [Language Policy, Completeness]"
- "Are technical identifiers (branch names, string keys, file paths) in English while
  product copy remains in the product locale? [Language Policy, Consistency]"
- "For Moodle features: are new or changed language strings listed with keys and
  product-locale values separate from English requirements? [Language Policy, Gap]"

Include additional language-policy items when `$ARGUMENTS` or the spec/plan signal
localized UI, validation messages, or Moodle `lang/` changes.

If `.specify/memory/language-policy.md` is missing, default to `artifact_language: en`
and `product_locale: es-ES`.

{CORE_TEMPLATE}
