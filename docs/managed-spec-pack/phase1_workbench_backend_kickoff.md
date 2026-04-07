# Phase 1 Workbench Backend Kickoff

## Purpose

Turn the approved phase-1 workbench handoff into the first backend-owned engineering sequence for `TRAA-37` without reopening UX packaging, shared-primitive scope, or workflow-policy decisions already fixed in `TRAA-34`, `TRAA-35`, and `phase1_workbench_backend_contract.md`.

## Fixed implementation stance

- Keep the phase-1 workbench as a desktop-first `WorkbenchShell` backed by REST plus SSE.
- Treat `permissions`, `blocking_reasons`, `required_approver`, `parallel_reviewers`, `lock`, and stale-state payloads as server-driven outputs.
- Keep the shared-now primitive boundary fixed. Backend should support the approved primitives, not invent alternate local state models.
- Build on the modular-monolith baseline with `api`, `worker`, and `scheduler`; do not split services before the first analyst workflow is stable.

Implementation reference for the foundation slice:

- `phase1_workbench_bootstrap_session_sse_substrate.md` is the concrete follow-on note for `TRAA-43` covering bootstrap payload shape, principal-session boundaries, RBAC evaluation order, and the outbox-backed SSE substrate.
- `phase1_workbench_rbac_session_permission_contract.md` is the concrete follow-on note for `TRAA-30` covering role-grant seeds, session states, human-versus-machine boundaries, and permission-denied behavior.

Slice follow-on notes:

- `phase1_workbench_source_triage_substrate.md` is the concrete follow-on note for `TRAA-44` covering the Source Triage Board read model, source detail payload, and triage mutation behavior.
- `phase1_workbench_authoring_substrate.md` is the concrete follow-on note for `TRAA-45` covering authoring detail payloads, locks, revisions, saves, and submit-for-review behavior.
- `phase1_workbench_review_queue_substrate.md` is the concrete follow-on note for `TRAA-46` covering the review-queue read model, selected-subject review context, review-action semantics, and publish-gate projection.

Cross-cutting addendum:

- `phase1_workbench_alert_surface_integration.md` is the concrete follow-on note for `TRAA-65` covering how the approved alert inbox, session-board summary, and alert lineage integrate into the same five-screen workbench plan without creating a sixth primary screen.
- `phase1_workbench_alert_inbox_substrate.md` is the concrete follow-on note for `TRAA-66` covering the executable shared-alert slice: bootstrap alert shell state, inbox list and detail routes, and the `Session Board` alert summary module.

## Backend prerequisite foundation

This foundation is required before the first screen slice is truly implementable:

1. `GET /v1/workbench/bootstrap` returning principal, role, scope, approval-policy rows, feature flags, and shell defaults.
2. Principal and RBAC evaluation wired to the phase-1 application roles and coverage scope.
3. SSE channel envelope and outbox flow for `assignment.updated`, `review_state.updated`, `lock.changed`, and `stale_state.updated`.
4. Shared revision, audit, and lock infrastructure from `phase1_workbench_backend_contract.md`.

This is not a separate UX surface, but it is the runtime substrate every first-wave screen depends on.

## First three build slices

### Slice 1: Source Triage Board

Ship the source-routing path first because it is the morning entry point and the front door for evidence and draft creation.

Backend-owned scope:

- `GET /v1/workbench/triage`
- `GET /v1/source-refs/{id}`
- `PATCH /v1/source-refs/{id}/triage`
- downstream create-flow hooks for evidence and draft creation from a selected `source_ref`
- triage read-model projection for urgency, ET deadline, coverage owner, existing downstream work, and stale-source replacement state

Done when:

- triage rows preserve stable IDs, versions, permissions, and downstream workflow summaries
- assignment and classification changes emit audit and SSE events
- source detail can open downstream work without client-side joins

### Slice 2: Evidence And Draft Workspace

Ship authoring next because it is the first mutable surface and establishes the lock, revision, provenance, and submit-for-review substrate.

Backend-owned scope:

- report, evidence, and recommendation detail endpoints
- revision history and diff endpoints
- create and save endpoints for `evidence_item`, `report`, and `recommendation`
- `/v1/locks`, heartbeat, takeover, and release flows
- validation for direct-support evidence, confidence rationale, and typed required fields

Done when:

- the editor can load one object with linked sources, revision history, review state, and lock state in one request path
- `409 lock_conflict` and `409 version_conflict` return the contract fields already locked in `phase1_workbench_backend_contract.md`
- submit-for-review works without the UI inferring approver or blocker logic

### Slice 3: Review Queue

Ship reviewer-facing workflow after authoring because it reuses the same objects, diffs, evidence summaries, and review-state substrate.

Backend-owned scope:

- `GET /v1/workbench/review-queue`
- review transition endpoints for submit, request changes, approve, and escalate
- publish eligibility projection where policy allows it
- review-queue row summaries for due time, current reviewer, approver, blockers, confidence delta, and lock context

Done when:

- reviewers can act from one queue row and detail pane without extra client-side policy logic
- queue rows expose exact blocker strings and required approver data inline
- review actions remain available even when another actor holds the content lock, if backend policy permits it

## Dependency order

1. Foundation substrate: principal session, RBAC, approval-policy resolution, audit envelope, lock and stale-state infrastructure.
2. Slice 1: Source Triage Board.
3. Slice 2: Evidence And Draft Workspace.
4. Slice 3: Review Queue.

Review Queue should not start as an isolated slice. It should reuse the authoring object model, diff pipeline, and review-state machinery built in Slice 2.

## Owner split

### BackendLead

- own the application session contract, RBAC evaluation, workflow-state transitions, locks, revisions, SSE envelope, and all read models for triage, draft, and review
- keep server-driven trust fields authoritative and centralized
- define the contract surface the future product engineer consumes rather than encoding workflow rules in the client

### DataPlatformLead

- lock the `source_ref`, evidence, provenance, freshness, and downstream-linkage datasets required by `TRAA-38`
- provide the source and evidence fields that let triage and draft flows avoid client-side joins or inferred lineage

### PlatformLead

- make shared auth, `staging`, deploy path, and observability ready under `TRAA-39`
- provide the environment path for real staff auth, fixture-backed scheduler behavior, and baseline audit visibility

### UXDesigner and prior UX handoff

- no design revision is needed for these first three slices
- primitive composition, trust-surface placement, and screen structure should be treated as fixed input

## Capacity and staffing note

The current backend lead can lock the service plan and backend slice order immediately, but screen-by-screen delivery velocity is still at risk without the approved `Senior Product Engineer, Analyst Workbench` hire from `TRAA-40`.

That is a throughput risk, not a contract blocker:

- backend can start the foundation, triage projection, and authoring substrate now
- full shell and dense-screen implementation should not assume BackendLead alone can carry both service work and all frontend delivery in parallel

## Blocker view

No UX or backend contract blocker is visible for `TRAA-37`.

The only reasons to reopen design would be:

- DataPlatform cannot supply the source and evidence lineage fields assumed by Slice 1 and Slice 2
- Platform cannot provide a real-auth, fixture-backed shared environment for the first implementation push

At the current scope, those are dependency checks against `TRAA-38` and `TRAA-39`, not reasons to revise the approved workbench design.
