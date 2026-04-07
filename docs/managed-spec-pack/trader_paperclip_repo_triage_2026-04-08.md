# Trader Paperclip Repo Triage

## Scope

First-pass technical intake for `TRAA-79` against the only provided repository link:

- `https://github.com/yyyljy/trader-paperclip`

This note records the actual starting point so engineering does not treat the repo link as if application code already exists.

## Findings

### 1. The linked GitHub repository is empty

Direct clone result on 2026-04-08:

- `git clone --depth 1 https://github.com/yyyljy/trader-paperclip trader-paperclip`
- `git status --short --branch` inside the clone returns `## No commits yet on main`
- the clone contains only `.git/`

Current read: there is no application scaffold, no package manager setup, no frontend, no backend, no infra code, and no README in the linked repo.

### 2. The only real technical source of truth today is the managed project spec pack

The active Paperclip project checkout contains the approved product and engineering documents, not a runnable product codebase.

Highest-signal implementation anchors:

- `technical_org_plan.md`
- `backend_agent_architecture.md`
- `phase1_workbench_backend_kickoff.md`
- `phase1_workbench_delivery_readiness.md`
- `phase1_senior_product_engineer_workbench_hire_request.md`

### 3. The program is architecture-ready, not repo-ready

The managed docs already lock the key decisions:

- modular monolith with `api`, `worker`, and `scheduler`
- `PostgreSQL` plus outbox, object storage, REST plus SSE
- desktop-first analyst workbench with server-driven permissions, locks, stale-state handling, and review workflow
- initial build order of foundation substrate, Source Triage Board, Evidence and Draft Workspace, then Review Queue
- shared environment path of `local`, `dev`, `staging`, and `prod`, with vendor access held to `prod`

That means the missing piece is not product direction. The missing piece is the repository bootstrap and first executable slices.

## Immediate Next Engineering Slices

### Slice 1. Bootstrap the canonical implementation repo

Create the first real codebase in `trader-paperclip` with:

- one workspace for `api`, `worker`, `scheduler`, and workbench web client
- package manager and build tooling
- base CI, lint, test, and migration paths
- local developer bootstrap using synthetic fixtures
- minimal README covering run, test, and environment assumptions

This is the current zero-to-one gap. Nothing else can ship cleanly until this exists.

### Slice 2. Stand up the backend foundation locked in `phase1_workbench_backend_kickoff.md`

First executable backend contract:

- `GET /v1/workbench/bootstrap`
- principal session and RBAC evaluation
- audit envelope and revision baseline
- lock plus stale-state infrastructure
- SSE envelope backed by outbox events

This should land before any UI-heavy screen work because the approved workbench is server-driven by design.

### Slice 3. Implement the first real workbench slice on top of that foundation

Start with the approved Source Triage Board path:

- `GET /v1/workbench/triage`
- `GET /v1/source-refs/{id}`
- `PATCH /v1/source-refs/{id}/triage`
- downstream create-flow hooks into evidence and draft creation

This matches the locked morning-entry workflow and gives the team the first meaningful end-to-end path.

### Slice 4. Bring up the shared delivery path in parallel

Platform should bootstrap:

- real staff auth in `dev` and `staging`
- CI deploy through workload identity or OIDC
- persistent `staging` with `api`, `worker`, and `scheduler`
- fixture-only replay path for non-prod environments

The docs already say this is not blocked by live vendor access.

## Staffing Read

The approved `Senior Product Engineer, Analyst Workbench` role remains the right throughput answer for dense UI delivery, but the empty repo is a more immediate gap than frontend polish.

Product engineering can accelerate screen implementation after the repository and backend substrate exist.

## CEO-Level Clarification Point

One clarification should be made explicit at the leadership layer:

- If `trader-paperclip` is intended to be the canonical implementation repo, engineering should treat this as a greenfield bootstrap and not assume hidden code exists elsewhere.
- If another real codebase already exists, leadership must point the team to that repo directly because the current linked repo does not contain implementation material.

This is the only true intake ambiguity exposed by the repo triage.

## Bottom Line

`TRAA-79` is not blocked by architecture uncertainty.

It is blocked by missing executable code in the linked repository.

The next honest move is to bootstrap the repo and land the backend foundation slice already specified in the managed project documents.
