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

## Phase commit (mandatory)

After spec updates are written, commit them on the current feature branch. Do
not rely on `.specify/extensions.yml` or `speckit.git.commit`. Do not create
`main`. Do not run `git branch`.

1. `git symbolic-ref --short HEAD` must be the feature branch (`NNN-short-name`).
2. If `git status --porcelain` is empty, stop this section.
3. Otherwise validate the message, then commit. Require exit code 0. Replace
   `<feature>` with the feature short name. The message MUST match Conventional
   Commits 1.0.0.

Bash:

```bash
git add -A
.specify/scripts/bash/check-commit-msg.sh "docs(spec): clarify <feature>"
git commit -m "docs(spec): clarify <feature>"
```

PowerShell:

```powershell
git add -A
.specify/scripts/powershell/check-commit-msg.ps1 "docs(spec): clarify <feature>"
git commit -m "docs(spec): clarify <feature>"
```

{CORE_TEMPLATE}
