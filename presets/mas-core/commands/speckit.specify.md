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

## MAS Feature Branch (mandatory)

This section **replaces** the core outline steps "Branch creation (optional, via hook)"
and "Create the spec feature directory". Branch creation is not optional for MAS and
does not depend on the git extension, `.specify/extensions.yml`, or a `before_specify`
hook. If that hook also runs, still perform the steps below. Do not write `spec.md`
until the feature branch exists and is checked out.

1. From the repository root, confirm this is a git work tree:
   `git rev-parse --is-inside-work-tree`. If it fails, stop and report the error.
2. Base the feature on `main`:
   - If `git rev-parse --verify main` succeeds, `git checkout main`.
   - If `main` does not exist and `git rev-parse --verify HEAD` fails (unborn
     repository), stay on the unborn branch and continue. The next `git checkout -b`
     names that first branch.
   - Otherwise stop. Do not create the feature branch from another branch.
3. Build a 2-4 word English short name (action-noun when possible).
4. Run the bundled script and require exit code 0. On Windows PowerShell use the
   `.ps1` script; otherwise use Bash. Stop on any failure and show stderr. Do not
   create the spec directory by hand as a fallback.
   - Bash: `.specify/scripts/bash/create-new-feature.sh --json --short-name "<short-name>" "<feature description>"`
   - PowerShell: `.specify/scripts/powershell/create-new-feature.ps1 -Json -ShortName "<short-name>" "<feature description>"`
5. Parse `BRANCH_NAME` from the JSON. It must look like `NNN-short-name` (sequential
   prefix unless `.specify/init-options.json` sets `feature_numbering` to `timestamp`).
6. Create and switch to that branch from the current `main` checkout:
   `git checkout -b "$BRANCH_NAME"`. If the branch already exists, `git checkout "$BRANCH_NAME"`.
   If either command fails, stop and do not write the spec.
7. Confirm `git rev-parse --abbrev-ref HEAD` equals `BRANCH_NAME`. The script already
   created `specs/<BRANCH_NAME>/spec.md` and `.specify/feature.json`. Fill that spec
   file. Do not create a second feature directory.

{CORE_TEMPLATE}
