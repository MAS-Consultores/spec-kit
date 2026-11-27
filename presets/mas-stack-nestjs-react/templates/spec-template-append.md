## Criterios de aceptación

Each acceptance criterion has an id `AC-01`, `AC-02`, and so on.

- **AC-01**: Given [state], when [action], then [outcome].

A test cites the id in its name or in a comment `// covers: AC-01`. `scripts/check-spec-traceability.mjs` fails when an id has no test or a test cites an id that is not in `specs/*/spec.md`.
