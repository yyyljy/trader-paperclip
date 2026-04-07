# Backend And Agent-Orchestration Architecture

## Objective

Stand up the first backend for a stock prediction platform that supports:

- research ingestion and structured analyst workflows
- reviewable daily recommendation production
- strict provenance, confidence, and audit history
- safe execution boundaries for scheduled jobs, model signals, and future agentic helpers

The phase-1 recommendation is a modular monolith with background workers, not a microservice fleet. The workflow contracts are still moving, and the product is desktop-first for internal analysts. We should optimize for correctness, traceability, and fast iteration before service splitting.

## Cross-Functional Contract

### Inputs locked from TRAA-2

- UX owns workflow design, surface hierarchy, tables and forms, and the presentation of confidence, provenance, and review state.
- Phase 1 is an internal analyst desk, desktop-first, with dense workflows and no investor-facing surface requirement yet.
- Assume near-real-time state refresh for assignments, alerts, approvals, and watchlist changes.
- Do not assume Google Docs style live co-editing in phase 1. Use record locks plus optimistic concurrency instead.

### Inputs locked from TRAA-3

- Canonical report types: `macro_brief`, `catalyst_list`, `desk_note`, `intraday_update`, `close_review`, `recommendation_packet`
- Every research object must preserve facts, inference, open questions, confidence, and source provenance.
- Daily workflow is SLA-bound in U.S. Eastern Time.
- Model outputs are inputs to analyst judgment, not an auto-publish path.
- Analyst responses to model signals must be persisted with lineage and override rationale.

### Backend ownership boundary

- Own API contracts, auth, RBAC, workflow state, review transitions, notification fanout, and execution control.
- Own audit history, versioning, and write-time validation for publishable objects.
- Own operational read models for the workbench, watchlists, recommendation packets, and review queues.
- Do not own raw source ingestion or dataset freshness. That belongs to the data platform.
- Do not own signal design or ranking logic. That belongs to quant once modeling work starts.

## Recommended Runtime Shape

### Deployable units

- `api`: one backend application exposing authenticated HTTP APIs and server-sent events
- `worker`: background executor for workflow jobs, timers, notifications, and projection rebuilds
- `scheduler`: cron-driven trigger process for market-session deadlines and periodic maintenance

### Shared infrastructure

- `PostgreSQL` as the system of record for workflow state, review history, permissions, and query projections
- object storage for large source captures, report attachments, and exported packets
- queue backed by Postgres plus outbox first; move to a dedicated broker only if throughput or fanout demands it
- optional Redis later for locks, short-lived caches, and hot alert fanout if Postgres polling becomes too expensive

### Why this shape

- one deployable control plane keeps architecture simple while the report schema and UX flows stabilize
- workers let us separate request latency from SLA jobs, projections, notifications, and backfills
- explicit module boundaries keep the codebase ready to split later without paying microservice tax now

## Core Domain Objects

### Reference and evidence layer

- `source_ref`: source metadata, source type, published timestamp, capture timestamp, locator, and intended use
- `source_snapshot`: immutable stored payload or attachment reference for a captured source at a specific time
- `evidence_item`: normalized evidence extracted or linked from one or more source refs

### Coverage and ownership layer

- `coverage_entity`: ticker or market scope with `desk`, `subsector`, `region`, `coverage_tier`, `primary_owner`, `backup_reviewer`, and active status
- `watchlist_entry`: current watch state, target session, rationale summary, urgency, and linked evidence

### Research workflow layer

- `report`: typed object for the six canonical report types, with required fields enforced by type
- `report_revision`: immutable revision record with editor, diff metadata, and reason
- `review_state`: shared review object for draft, in_review, approved, published, withdrawn, and superseded transitions

### Recommendation layer

- `recommendation`: direction, thesis, catalyst path, invalidation, confidence, and supporting evidence
- `recommendation_packet`: dated publish unit containing approved recommendations for the next cycle
- `recommendation_decision_log`: explicit record of promotions, demotions, withdrawals, and rationale changes

### Model and automation layer

- `model_signal`: signal id, ticker, direction, model score, driver summary, data vintage, and lineage
- `analyst_signal_decision`: confirm, reject, needs_follow_up, or escalate, with rationale and confidence delta
- `workflow_job`: scheduled or event-driven execution record with attempt history, actor type, and idempotency key

## Module Boundaries Inside The Backend

### 1. Identity and access module

- human auth for staff users and machine auth for internal jobs
- RBAC around analyst, lead, approver, admin, and system actors
- scoped permissions for who can draft, review, approve, publish, withdraw, or override

### 2. Research workflow module

- create and edit reports
- validate per-type required fields
- manage review transitions and revision history
- attach evidence and source refs

### 3. Recommendation module

- build and revise recommendation candidates
- assemble recommendation packets
- enforce publish gates: required reviewer, confidence, invalidation trigger, and provenance completeness

### 4. Workbench query module

- serve UX-facing read models for inboxes, review queues, watchlists, timeline views, packet summaries, and audit panes
- keep denormalized query projections optimized for dense desktop views
- support SSE updates for status, assignment, approval, and alert changes

### 5. Orchestration module

- own scheduled deadlines, retryable workflow jobs, timeout handling, and escalation rules
- trigger pre-market, intraday, close, and next-cycle jobs from ET-based schedules
- react to data-platform events without embedding ingestion logic into the UI path

### 6. Audit and lineage module

- append-only audit events for every state transition, publish action, withdrawal, assignment, and automated write
- tie workflow actions back to source refs, model signals, and user or machine principals
- expose queryable history for trust review and future compliance needs

### 7. Notification and alert module

- notify responsible owners when deadlines, material updates, or review actions fire
- support in-app notifications first, then email or chat hooks later
- keep notification fanout asynchronous and idempotent

## API Boundary Proposal

### Write APIs

- `/auth/*` for login, session, and machine principal flows
- `/coverage/*` for covered entities and watchlist ownership
- `/reports/*` for typed research objects and revisions
- `/reviews/*` for workflow transitions, approvals, and withdrawals
- `/recommendations/*` for recommendation candidates and packet publishing
- `/signals/*` for quant or model-signal intake and analyst decisions
- `/jobs/*` for internal execution inspection and controlled replays

### Read APIs

- `/workbench/*` for analyst inbox, review queue, and daily desk views
- `/watchlists/*` for active thesis monitoring and alert state
- `/packets/*` for dated recommendation output and version history
- `/audit/*` for source provenance, revision history, and who changed what

### Realtime

- use SSE channels for review-state changes, watchlist alerts, packet publication, and ownership changes
- avoid WebSocket complexity until we have a clear need for bidirectional collaboration

## Workflow State Model

### Shared review states

- `draft`
- `in_review`
- `approved`
- `published`
- `withdrawn`
- `superseded`

### Transition rules

- only humans with the correct role can move objects into `approved` or `published`
- automated jobs may create drafts, enrich metadata, or request review, but they cannot publish recommendations
- every state change writes an audit event and, when relevant, a notification job
- optimistic concurrency version checks prevent silent overwrites in dense analyst workflows

## Event Flow

### Primary flow

1. Data platform captures sources and normalized market events.
2. Backend receives source references or material event notifications.
3. Orchestration creates or updates analyst work items, watchlist entries, and due timers.
4. Analysts create or revise typed reports with evidence links and confidence.
5. Leads review and approve candidate recommendations.
6. Backend assembles a dated recommendation packet and publishes an immutable revision.
7. Downstream consumers read packet and watchlist projections through stable APIs.

### Model-signal loop

1. Quant or data platform posts a `model_signal`.
2. Backend routes it to the owning desk or analyst queue.
3. Analyst records `confirm`, `reject`, `needs_follow_up`, or `escalate`.
4. Decision and confidence delta feed both the audit trail and future learning analysis.

## Execution Boundaries

### Allowed machine actions

- create drafts from structured upstream events
- compute reminders, deadlines, and escalation queues
- rebuild projections and derived summaries
- deliver notifications and export packets

### Forbidden machine actions in phase 1

- publish or withdraw recommendations without a named human approver
- mutate confidence or recommendation direction without an attributable review action
- bypass provenance validation or required source references

### Control rules

- every job must have an idempotency key, timeout, retry policy, and actor identity
- long-running jobs write heartbeat timestamps and terminal status
- dead-letter failed jobs with enough context for replay and diagnosis

## Persistence Responsibilities

### PostgreSQL

- normalized workflow tables
- revision and audit-event tables
- outbox table for async events
- denormalized read models for workbench and watchlist queries

### Object storage

- raw source snapshots
- attachments and exported recommendation packets
- large evidence artifacts that should not live inline in Postgres

### What stays out of the backend database

- high-volume raw market ingest streams
- feature computation history owned by the data platform
- backtesting outputs owned by quant unless surfaced into workflow decisions

## Recommended Build Order

### 1. Workflow foundation

- auth and machine principals
- RBAC and role matrix
- shared review-state machine
- audit-event envelope
- Postgres schema plus outbox

### 2. Research workbench APIs

- coverage entities
- source refs and evidence linking
- typed report creation and revision history
- workbench read models for desk notes and review queues

### 3. Recommendation pipeline

- recommendation candidates
- packet assembly
- publish and withdrawal rules
- watchlist projection and packet history

### 4. Orchestration and SLA engine

- ET session scheduler
- intraday escalation timers
- notification fanout
- job replay and dead-letter handling

### 5. Model-signal intake

- signal contract endpoint
- analyst response workflow
- lineage joins between signals, evidence, and recommendation changes

### 6. Scale and hardening

- cache or Redis only if read pressure or locks demand it
- split read-heavy or execution-heavy modules into separate deployables only after real bottlenecks appear

## Key Decisions

- start with a modular monolith and workers
- prefer REST plus SSE over GraphQL or full WebSocket collaboration
- treat workflow transitions as first-class state machines, not loose status fields
- make audit and provenance mandatory on day one
- keep machine actors narrow: assist, queue, enrich, and notify, but do not publish

## Key Risks

- if data-platform contracts are late or unstable, the workbench and SLA orchestration will thrash
- ET-bound deadlines create timezone and market-calendar edge cases that must be centralized
- dense analyst workflows will surface concurrency issues quickly if optimistic locking and revision history are weak
- recommendation logic will become opaque if facts, inference, and source lineage are not stored separately
- premature microservice splits will slow delivery before workflow boundaries are validated

## Immediate Next Technical Tasks

- convert the shared domain objects into schema definitions and API contracts
- define the RBAC matrix for analyst, lead, approver, admin, and machine actors
- specify the outbox events needed between backend, data platform, and quant
- decide whether recommendation packet generation runs synchronously on approval or asynchronously through the worker queue
