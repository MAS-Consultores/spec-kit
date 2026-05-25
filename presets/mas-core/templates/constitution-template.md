# [PROJECT_NAME] Constitution

## Core Principles

### I. Security and Access Control

- Every feature MUST identify its actors, permissions, sensitive data, privacy
  obligations, and abuse or failure paths before implementation begins.

# Security Standard (Stack-Agnostic)

This document defines cross-stack security expectations aligned with OWASP ASVS Level 2 and the OWASP Top 10. Stack-specific constraints and security guidance are materialized in `.specify/memory/stack.md`, `.specify/memory/security-guidelines.md`, and `.specify/memory/stack-context.md` when a project stack is registered via `specify init --stack`.

## 1. Authentication and Identity Lifecycle

**MUST**

- Identify all actors (human and system) and authentication mechanisms before implementation.
- Enforce unique, traceable accounts for privileged operations; prohibit shared production credentials.
- Use adaptive password hashing (bcrypt, Argon2, or equivalent) for stored passwords; prohibit md5, sha1, or reversible encoding for credentials.
- Require multi-factor authentication for administrative or high-privilege roles where technically feasible.

**SHOULD**

- Prefer session lifetimes and idle timeouts appropriate to risk; re-authenticate before sensitive actions when justified.

**Evidence in plans / PRs**

- List of authentication flows touched, MFA policy for affected roles, and password-storage approach.

## 2. Authorization and Access Control

**MUST**

- Deny by default; grant access only through explicit business roles or operational responsibility.
- Enforce authorization on the server for every entrypoint (including APIs, jobs, and CLI); never rely on UI or client-only checks.
- Document permission changes and review impact on existing roles.

**SHOULD**

- Schedule periodic permission reviews for long-lived systems.

**Evidence**

- Capability or role matrix for the feature, denial-path QA notes.

## 3. Session and Cookie Management

**MUST**

- Use TLS for all authenticated traffic; set cookies with `Secure`, `HttpOnly`, and appropriate `SameSite`.
- Invalidate or rotate sessions when privilege level changes.

**SHOULD**

- Prefer short-lived tokens for APIs where the product model allows it.

**Evidence**

- Session and cookie configuration notes for each environment.

## 4. Cryptography

**MUST**

- Use maintained libraries and current algorithms; prohibit custom cryptography.
- Protect data at rest when storing secrets or regulated personal data; manage keys outside source control.

**SHOULD**

- Document key rotation procedures where application-level encryption is used.

**Evidence**

- Algorithms, libraries, and key-handling summary for the change.

## 5. Secrets and Configuration Management

**MUST**

- Never commit secrets, API keys, or production credentials to the repository or tickets.
- Load secrets from secure configuration or secret stores; rotate after exposure.

**Evidence**

- Confirmation that no secrets were added to tracked files or logs.

## 6. Input Validation and Output Encoding

**MUST**

- Validate all untrusted input on the server with explicit types and bounds.
- Encode output in context (HTML, JSON, SQL) to mitigate XSS and injection.
- Use parameterized queries or ORM bindings; prohibit string-concatenated SQL with user input.
- Protect state-changing requests against CSRF where the stack uses browser sessions.

**Evidence**

- Validation rules, encoding approach, and CSRF strategy for new or changed surfaces.

## 7. File Upload and File Handling

**MUST**

- Restrict file types, size, and storage location; scan or validate content where risk warrants.
- Serve user-controlled files through controlled endpoints with authorization checks.

**Evidence**

- Upload pipeline description and access checks for downloads.

## 8. HTTP Security Headers and CORS

**MUST**

- Apply CSP, HSTS, `X-Content-Type-Options`, and a coherent `Referrer-Policy` in production unless formally excepted.
- Restrict CORS to required origins and methods only.

**Evidence**

- Header configuration source (middleware, reverse proxy, or platform).

## 9. API Security and Rate Limiting

**MUST**

- Authenticate and authorize every API operation; avoid wide-open anonymous write endpoints.
- Rate-limit authentication, password recovery, and abuse-sensitive endpoints.

**Evidence**

- Throttle or limiter configuration and test notes.

## 10. Logging, Monitoring, and Audit

**MUST**

- Log security-relevant events (authentication failures, permission denials, administrative changes) without storing credentials or unnecessary PII.
- Ensure business-critical and permission-sensitive mutations emit audit evidence (who, what, when).

**Evidence**

- Log and audit event list for the feature.

## 11. Dependency and Supply Chain

**MUST**

- Track direct and transitive dependencies; run vulnerability scans in CI where available.
- Address or formally accept high-severity findings before production promotion.

**Evidence**

- Audit tool output or ticket references for dependency updates.

## 12. Privacy and Data Protection

**MUST**

- Classify personal and sensitive data; apply minimization, retention limits, and lawful basis where applicable.
- Prohibit production data in non-production environments unless approved and sanitized.

**Evidence**

- Data classes touched, retention, and sanitization approach.

## 13. Error Handling and Information Disclosure

**MUST**

- Disable verbose errors and stack traces in production; avoid leaking internals in client-visible messages.

**Evidence**

- Production error-handling configuration for the change.

## 14. Secure SDLC

**MUST**

- Perform lightweight threat modeling for high-risk changes (auth, payments, bulk data, new integrations).
- Use peer review for security-sensitive code paths.

**SHOULD**

- Integrate SAST or dependency scanning in CI when tooling exists.

**Evidence**

- Threat notes or checklist, review record.

## 15. Environment Hardening

**MUST**

- Keep non-production parity for security controls where feasible; document gaps.
- Harden administrative interfaces and background job dashboards.

**Evidence**

- Environment-specific configuration checklist.

## 16. Incident Response and Recovery

**MUST**

- Define how security incidents are reported, contained, and communicated.
- Ensure backups and rollback paths exist for schema and configuration changes that affect security posture.

**Evidence**

- Rollback and recovery notes in the implementation plan.

### II. Traceability and Auditability

- Plans MUST identify operationally relevant actions, reports, exports, and data
  changes that require auditability or review history.
- Requirements, decisions, code changes, data migrations, and releases MUST be
  traceable from specification through deployment.
- Business-critical, permission-sensitive, and data-changing operations MUST emit
  audit evidence sufficient to reconstruct who acted, on what, and when.
- Hotfixes, manual interventions, and emergency changes MUST leave the same
  reviewable record as standard delivery work.

### III. Explicit Data Models and Integrity

- Specifications and plans MUST describe the affected entities, relationships,
  validation rules, and persistence changes before tasks are generated.
- Core entities, relationships, lifecycle states, validation rules, and ownership
  boundaries MUST be modeled explicitly before implementation.
- Persistent changes MUST be backed by an explicit data model, including an ER
  view and data dictionary or equivalent artifact suitable for the chosen stack.
- Data changes MUST preserve referential integrity, deterministic business rules,
  and safe retry behavior where failures or duplicate execution are plausible.
- Irreversible or high-impact data changes MUST include migration, recovery, and
  stakeholder communication planning before release.

### IV. Operational Performance and Reliability

- Reporting, export, integration, and administrative workflows MUST include
  performance assumptions, failure modes, and recovery expectations.
- Every feature MUST declare measurable operational expectations such as response
  time, throughput, latency sensitivity, or batch-processing limits.
- Systems MUST provide actionable logging, diagnostics, and failure visibility so
  support and engineering teams can isolate incidents without ad hoc code changes.
- Integrations, jobs, and high-volume read or write paths MUST be designed for
  bounded resource usage, graceful degradation, and predictable recovery.

### V. Administrative Usability

- Coordinator, administrator, and back-office workflows MUST be designed for clear
  state, error handling, and repeatable operational use.
- Administrative and back-office workflows are first-class product surfaces and
  MUST be designed for clarity, efficiency, and safe error recovery.
- Operational users MUST be able to understand record state, recent changes, and
  next available actions without requiring direct database or source-code access.
- Data-heavy screens and operational listings MUST support navigable, bounded
  result sets and predictable filtering or pagination behavior.
- Bulk actions, status transitions, and approval flows MUST include safeguards
  proportionate to their business impact.

### VI. Error Handling and Failure Management

- The system MUST handle expected errors in a controlled manner without causing
  complete failure of pages, views, processes, or user flows.
- Operations at risk of failure—such as database queries, external integrations,
  file operations, HTTP calls, jobs, batch processes, and critical validations—MUST
  include explicit error handling.
- When the selected stack or language permits, `try/catch` or equivalent mechanisms
  SHOULD be used to capture exceptions at relevant system boundaries.
- Errors MUST NOT be suppressed silently. A clear strategy MUST exist to capture
  the error, log useful diagnostic information, respond with a controlled message,
  and keep the application in a safe, consistent state.
- User-visible messages MUST be clear, actionable, and non-technical.
- User-visible messages MUST NOT expose stack traces, SQL queries, internal table
  names, file paths, tokens, secrets, credentials, or internal infrastructure
  details.
- When a database query returns no rows, that outcome SHOULD be treated as a valid
  empty state when appropriate—not as a fatal error. For example, show context-
  appropriate messaging such as “No values were found for this field” rather than
  failing the entire flow.
- Empty states, validation errors, permission errors, connectivity errors, and
  unexpected errors MUST be clearly distinguished in code, logs, and user
  experience.
- Logs MUST be sufficiently clear for technical diagnosis, including relevant
  operational context such as module, action, affected entity, safe identifier when
  applicable, user or role when applicable, timestamp, and a summarized cause.
- Logs MUST avoid storing unnecessary sensitive data, credentials, tokens, excessive
  personal information, or full payloads when not required for diagnosis.
- Administrative and back-office flows MUST maintain operational continuity when
  partial errors occur; for example, a table, filter, or field with no results
  MUST NOT block the entire page when the rest of the view can render safely.
- Unexpected errors MUST have controlled fallback behavior and sufficient
  traceability for support or development follow-up.
- Specifications and plans SHOULD identify the main failure modes of the
  functionality and how each will be communicated to users.

### VII. Stack-Constrained Design

- Implementation plans MUST stay within the stack selected during MAS
  initialization (`specify init --stack <stack-id>`) unless an explicit deviation
  is documented and approved.
- Stack-specific constraints, security profiles, and validation expectations live
  in `.specify/memory/stack.md`, `.specify/memory/security-guidelines.md`, and
  `.specify/memory/stack-context.md`; this constitution remains principle-driven
  and stack-agnostic.

### VIII. Maintainability and Standardization

- Codebases MUST favor shared patterns, reusable components, disciplined schema
  handling, and clear module boundaries over ad hoc feature-by-feature design.
- Repeated form, validation, and administrative interaction patterns MUST be
  standardized through reusable project-level components or equivalents.
- Infrastructure, runtime dependencies, and environment assumptions MUST be
  explicit, reproducible, and appropriate for the selected approved stack.

### IX. Controlled Delivery and Rollback Readiness

- Risky changes MUST include rollout, rollback, and data recovery considerations
  before implementation.
- Each release MUST be deployable in controlled increments with validated rollback,
  mitigation, or containment paths proportional to its operational risk.
- Database changes, configuration changes, and third-party dependency changes MUST
  be reversible or explicitly risk-accepted before release.
- Delivery flow MUST preserve traceability: one branch per functionality, clear
  incremental commits, QA validation before release, and promotion through
  testing before master except for justified hotfixes.
- Production deployment MUST include controlled execution, rollback readiness, and
  post-release validation of critical operational behavior.
- Production promotion MUST be blocked when security, data integrity,
  observability, or recovery readiness cannot be demonstrated.

## Governance

This constitution is the shared MAS governance baseline and overrides local
preferences and lower-level guidance whenever they conflict.

Stack-specific constraints and security guidance are loaded from the MAS stack
selected during `specify init --stack <stack-id>` into `.specify/memory/`.

Constitution compliance MUST be checked during specification, planning, review,
and release approval; unresolved violations block progression.

Amendments require documented rationale, review of impacted templates and workflow
artifacts, approval by the maintainers of this internal distribution, and
documentation of expected impact and migration or communication needed for
active projects.

Versioning follows semantic intent: MAJOR for incompatible governance changes,
MINOR for new principles or materially expanded obligations, and PATCH for
clarifications that do not alter enforcement.

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
