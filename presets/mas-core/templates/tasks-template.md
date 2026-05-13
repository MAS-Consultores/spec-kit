---
description: "MAS stack-aware task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Required MAS Inputs**: `.specify/memory/constitution.md`, `.specify/memory/stack.md`, `.specify/memory/security-guidelines.md`, `.specify/memory/stack-context.md`, and `plan.md` with `MAS Stack Validation`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are OPTIONAL - include them when requested by the feature specification or when MAS validation requires verification work.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## MAS Task Inputs

- **Selected Stack**: Use the stack fixed during initialization. Do not reselect the technology stack during task generation.
- **Constitution**: Convert company-wide governance into concrete tasks only where implementation work is needed.
- **Security Guidelines**: Add tasks for stack-specific security checks, permissions, roles, visibility, sensitive data handling, auditability, and exports where relevant.
- **Stack Context**: Cover expected artifacts, stack constraints, compatibility requirements, and anti-pattern mitigation from `stack-context.md`.
- **Plan Validation Results**: Use the `MAS Stack Validation` section in `plan.md` to decide whether implementation tasks can proceed.

## MAS Validation Handling

- `PASS`: No extra remediation task is required for that validation item unless plan details already imply implementation work.
- `WARNING`: Add focused verification, follow-up, monitoring, or risk-reduction tasks when the warning affects delivery.
- `DEVIATION_REQUIRED`: Add explicit remediation, approval, mitigation, and documentation tasks before or inside the affected user story.
- `HARD_FAIL`: Stop normal implementation task generation. Generate only plan-repair tasks that identify what must be corrected before implementation can proceed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions
- Include MAS remediation tasks in the earliest phase or story where they block safe implementation

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Moodle plugin**: `classes/`, `db/`, `lang/`, `tests/`, plugin entry files
- **Laravel/Inertia**: `app/`, `routes/`, `resources/js/`, `database/`, `tests/`
- Paths shown below are examples - adjust based on plan.md structure and selected stack context

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The __SPECKIT_COMMAND_TASKS__ command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - MAS Stack Validation results from plan.md
  - MAS memory files under .specify/memory/
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, baseline structure, and MAS context checks

- [ ] T001 Confirm selected stack and MAS memory files are present under `.specify/memory/`
- [ ] T002 Create project structure per implementation plan and selected stack context
- [ ] T003 [P] Configure linting, formatting, and local validation tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Resolve or document all `WARNING` and `DEVIATION_REQUIRED` items from `MAS Stack Validation`
- [ ] T005 Implement authentication, authorization, permissions, roles, and visibility boundaries required by the selected stack
- [ ] T006 [P] Add stack-specific security validation and sensitive data handling safeguards
- [ ] T007 Create base models/entities and data integrity rules that all stories depend on
- [ ] T008 Configure audit, traceability, logging, and export/report guardrails
- [ ] T009 Add expected stack artifacts required by `.specify/memory/stack-context.md`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own, including MAS security or stack checks that apply]

### Tests for User Story 1 (OPTIONAL - only if tests requested or MAS validation requires them)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T011 [P] [US1] Security or permission test for [role/visibility rule] in tests/[location]/test_[name].py

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create [Entity1] model in src/models/[entity1].py
- [ ] T013 [P] [US1] Create [Entity2] model in src/models/[entity2].py
- [ ] T014 [US1] Implement [Service] in src/services/[service].py (depends on T012, T013)
- [ ] T015 [US1] Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T016 [US1] Add validation, error handling, and sensitive data controls
- [ ] T017 [US1] Add audit/logging for user story 1 operations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (OPTIONAL - only if tests requested or MAS validation requires them)

- [ ] T018 [P] [US2] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T019 [P] [US2] Integration test for [user journey] in tests/integration/test_[name].py

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create [Entity] model in src/models/[entity].py
- [ ] T021 [US2] Implement [Service] in src/services/[service].py
- [ ] T022 [US2] Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T023 [US2] Integrate with User Story 1 components only where independently testable

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional unit tests (if requested) in tests/unit/
- [ ] TXXX Security hardening against stack-specific guidelines
- [ ] TXXX Validate reports, exports, pagination, and operational load assumptions
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - may integrate with US1 but must be independently testable
- **User Story 3+**: Can start after Foundational (Phase 2) - may integrate with prior stories but must preserve independent validation

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Security, permissions, roles, visibility, and audit tasks before story checkpoint
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel when they touch different files
- Once Foundational phase completes, user stories can start in parallel if team capacity allows
- Tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Security or permission test for [role/visibility rule] in tests/[location]/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational, including MAS validation remediation
3. Complete Phase 3: User Story 1
4. STOP and VALIDATE: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Deploy/Demo
3. Add User Story 2 -> Test independently -> Deploy/Demo
4. Add User Story 3 -> Test independently -> Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to a specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing when tests are included
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid vague tasks, same-file conflicts, and cross-story dependencies that break independence
