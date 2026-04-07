# trader-paperclip

Canonical implementation repository for Paperclip's analyst workbench and modular-monolith runtime.

## What Landed In This Bootstrap

- `pnpm` workspace with four executable apps: `api`, `worker`, `scheduler`, and `web`
- shared packages for `contracts`, `config`, and the fixture-backed `foundation` substrate
- replay-aware `GET /v1/workbench/bootstrap` and SSE flow aligned to the approved phase-1 backend notes
- stable root task entrypoints for install, lint, typecheck, test, build, and migrations
- Dockerfiles, a synthetic-first local compose path, and a GitHub Actions CI workflow

The managed spec pack in [`docs/managed-spec-pack`](./docs/managed-spec-pack) remains the source of truth for product and workflow behavior. This repo now turns that contract into a runnable codebase instead of a docs-only shell.

## Workspace Layout

```text
trader-paperclip/
  apps/
    api/
    scheduler/
    web/
    worker/
  packages/
    config/
    contracts/
    fixtures/
    foundation/
  docker/
  docs/
  fixtures/
  migrations/
```

## Prerequisites

- Node.js 22+
- Corepack enabled so `pnpm` resolves consistently

```powershell
corepack enable
corepack pnpm install
```

## Root Task Runner

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm db:migrate`

Service-specific entrypoints:

- `corepack pnpm dev:api`
- `corepack pnpm dev:worker`
- `corepack pnpm dev:scheduler`
- `corepack pnpm dev:web`
- `corepack pnpm dev`

## Local Synthetic Bootstrap

1. Install dependencies: `corepack pnpm install`
2. Copy `.env.example` to `.env` if you want overrides
3. Start the stack: `corepack pnpm dev`
4. Open the workbench shell at `http://localhost:5173`
5. Hit the API directly at `http://localhost:4000/healthz`

Local stays synthetic-first:

- no live vendor credentials
- no secret-manager dependency
- fixture-backed bootstrap, SSE, worker, and scheduler behavior
- migration validation through the repo-local SQL in `migrations/`

## Services

- `apps/api`: Fastify API serving health, readiness, fixture-backed bootstrap, and SSE replay
- `apps/worker`: worker runtime exposing health and readiness against the same fixture foundation
- `apps/scheduler`: scheduler runtime exposing health and readiness against the same fixture foundation
- `apps/web`: Vite workbench shell that renders the bootstrap contract and fallback state

## Environment Contract

The explicit repo-local environment schema lives in [`docs/environment-contract.md`](./docs/environment-contract.md).

## Containers And CI

- Dockerfiles live under [`docker`](./docker)
- local compose path lives at [`docker/compose.local.yml`](./docker/compose.local.yml)
- CI workflow lives at [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

## Current Slice Boundary

This bootstrap intentionally stops at the first executable substrate:

- health and readiness surface
- shared config contract
- synthetic `GET /v1/workbench/bootstrap`
- SSE authorization and replay logic

It does not yet implement the first persistent triage, authoring, review, or packet workflows from the managed spec pack. Those remain the next backend-owned slices after the repo bootstrap.
