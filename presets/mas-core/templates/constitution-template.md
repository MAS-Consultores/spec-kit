# MAS Project Constitution

## Core Principles

### I. Security and Access Control

# Security Standard (Stack-Agnostic)

This document defines cross-stack security expectations aligned with OWASP ASVS Level 2 and the OWASP Top 10. Stack-specific controls are additionally listed in `.specify/memory/security-guidelines.md` under **Security Controls**, **Security Pitfalls**, and **Security Evidence** when a project stack is registered via `specify init --stack`.

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
Plans MUST identify operationally relevant actions, reports, exports, and data
changes that require auditability or review history.

### III. Explicit Data Models and Integrity
Specifications and plans MUST describe the affected entities, relationships,
validation rules, and persistence changes before tasks are generated.

### IV. Operational Performance and Reliability
Reporting, export, integration, and administrative workflows MUST include
performance assumptions, failure modes, and recovery expectations.

### V. Administrative Usability
Coordinator, administrator, and back-office workflows MUST be designed for clear
state, error handling, and repeatable operational use.

### VI. Stack-Constrained Design
Implementation plans MUST stay within the stack selected during MAS
initialization unless an explicit deviation is documented and approved.

### VII. Maintainability and Standardization
Solutions MUST follow the selected stack's conventions and avoid introducing
parallel patterns without documented justification.

### VIII. Controlled Delivery and Rollback Readiness
Risky changes MUST include rollout, rollback, and data recovery considerations
before implementation.

## Governance

This constitution is the shared MAS governance baseline. Stack-specific
constraints and security guidance are loaded from the MAS stack selected during
`specify init --stack <stack-id>`.

Amendments require documentation of the changed rule, expected impact, and any
migration or communication needed for active projects.

**Version**: 0.1.0 | **Ratified**: 2026-05-13 | **Last Amended**: 2026-05-19
