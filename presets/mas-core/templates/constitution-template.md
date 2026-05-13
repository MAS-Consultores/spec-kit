# MAS Project Constitution

## Core Principles

### I. Security and Access Control
All features MUST define authentication, authorization, and data visibility
rules for the affected user roles before implementation begins.

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

**Version**: 0.1.0 | **Ratified**: 2026-05-13 | **Last Amended**: 2026-05-13
