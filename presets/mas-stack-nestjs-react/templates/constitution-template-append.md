
## NestJS + React Stack Constitution

The following stack-specific principles are constitution-level requirements for all NestJS + React projects:

### Comprehensive Auditing

Every relevant action MUST be audited—this is foundational, not optional:
- Audited actions: create, update, soft delete, restore, hard delete, permission changes, auth events, exports, MCP tool calls
- Append-only `AuditLog` enforced at DB level (role with only INSERT/SELECT or trigger)
- Audit write in same `$transaction` as business operation or via outbox pattern
- Sensitive data masked; retention via monthly partitions

### Soft Delete by Default

Soft delete is mandatory for all business entities:
- Models include `deletedAt DateTime?` and `deletedBy String?`
- Hard delete requires `<category>:eliminar_permanente` permission and justification
- Extension order: `$extends(createCaslExtension()).$extends(softDeleteExtension)`

### Performance Principles

Performance is a first-class requirement:
- No N+1 queries; explicit `select`; indexed columns
- Server-side pagination mandatory (default 20, max 100)
- Async heavy work; short transactions; p95 < 300 ms target

### Validation Single Source of Truth

Zod schemas in `packages/contracts` are the ONLY validation source:
- Validate on BOTH frontend and backend
- Request schemas strict; response schemas strip unknown
- RFC 9457 Problem Details for errors
