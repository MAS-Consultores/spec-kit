---
description: NestJS + React completion gate on top of MAS implement.
strategy: wrap
---

## NestJS + React completion gate

Do not declare the feature finished, and do not merge, until these suites have been executed and their output is in the report:

- API e2e: supertest against the SWC build (`start:e2e`) and real Postgres. At least one test per REST endpoint, including 401, CASL 403, refresh-token rotation, and throttling 429.
- MCP e2e: Bearer and scopes against that Postgres. At least one test per MCP tool.
- Playwright with axe-core: at least one spec per user story. `screenshot`, `video`, and `trace` stay `'off'`.
- Unit tests for each domain service, guard, and CASL policy.

A run that only has a few unit tests and a single Playwright spec does not meet the gate.

{CORE_TEMPLATE}
