# Trader Paperclip Platform Delivery Preflight

## Objective

Turn `TRAA-82` into the exact platform preflight for the first canonical `trader-paperclip` implementation repo.

This note does not invent a second codebase. It records what Platform can lock now, what stays fixed from the approved phase-1 environment posture, and what still depends on the repo bootstrap under `TRAA-81`.

## Current Anchor

- `TRAA-79` already confirmed the linked GitHub repo was empty.
- A fresh `git ls-remote https://github.com/yyyljy/trader-paperclip.git` read on 2026-04-08 still returned no refs.
- No local canonical `trader-paperclip` checkout is visible under the managed Paperclip project root or the usual local workspace roots checked for this wake.
- The managed spec pack remains the only implementation source of truth today.

Current read: `TRAA-82` is still a preflight and delivery-contract issue, not a repo-wiring issue yet.

## Fixed Delivery Posture

The following platform decisions are already locked and should not be reopened when the repo bootstrap lands:

- Runtime shape stays `api`, `worker`, and `scheduler` on one general container platform.
- `local` stays synthetic and fast, with no shared vendor credentials and no secret-manager dependency for normal onboarding.
- `dev` is the merge and contract-test environment with real staff auth, workload identity, and synthetic or masked fixtures only.
- `staging` is persistent and production-shaped for auth, deploy controls, scheduler behavior, secret reads, and audit visibility, but remains fixture-only for market-data inputs.
- `prod` is the only environment allowed to hold live vendor credentials and licensed market data.
- Preview environments stay stateless and may host only UI and API slices against synthetic backends. They do not run full workers, schedulers, or vendor-connected jobs.
- CI must use OIDC or workload identity federation only. Long-lived cloud keys stay out of scope.
- The same build artifact must promote forward from `dev` to `staging`.

## Platform Contract For The First Canonical Repo

### 1. Repo and CI assumptions

The canonical repo is GitHub-hosted, so the default CI assumption should be GitHub-native OIDC unless CTO chooses another runner explicitly.

The repo bootstrap under `TRAA-81` should land one standard root workflow that can drive:

- dependency install
- lint
- typecheck
- unit and integration tests
- build
- container image build
- migration validation

Platform does not need the final command strings yet, but the repo must expose one stable task runner or package-manager interface so CI does not encode tool-specific guesses outside the repo.

### 2. Shared-environment identities

The first repo-backed push needs these machine-identity classes:

- one CI deploy identity for `dev`
- one CI promotion identity for `staging`
- one runtime identity each for `api`, `worker`, and `scheduler` in shared environments
- one `fixture_loader` identity in `staging` if fixture promotion is implemented as a separate runtime role

The vendor-only identities already fixed elsewhere remain out of lower environments:

- `svc-prod-alert-vendor-connector`
- `svc-prod-consensus-vendor-connector`
- `svc-prod-vendor-fixture-exporter`
- `svc-dev-alert-consensus-fixture-loader`
- `svc-staging-alert-consensus-fixture-loader`

`api`, `worker`, `scheduler`, CI, local development, and previews stay outside the live vendor trust boundary.

### 3. Secret and configuration boundary

Platform can lock the boundary now even though the repo-local env var names do not exist yet:

- per-environment app secret namespaces must be isolated
- `dev` and `staging` may hold app config, auth integration config, deploy credentials, and fixture verification material
- `dev` and `staging` may not hold live vendor credentials
- `prod` remains the only environment that can materialize vendor namespaces such as `prod/vendor/consensus/lseg-ibes/current`

The repo bootstrap still needs to declare the concrete application configuration surface for:

- database connection and migration target
- queue and scheduler backing services
- object-storage bucket or prefix targets
- SSO issuer and audience settings
- SSE and API public-base settings
- observability exporter endpoints and service names

Until that repo-local config contract exists, Platform should not invent final env var names in a separate document.

### 4. `dev` environment expectation

`dev` must be ready for:

- real staff SSO
- CI-driven deploy through workload identity
- migrations and contract validation against synthetic or masked data
- API, worker, and optional scheduler validation with no live vendor egress
- deploy, secret-read, and access audit visibility

`dev` does not need:

- production-like market-data connectivity
- live vendor credentials
- full replay of scheduled market workflows

### 5. `staging` environment expectation

`staging` must be ready for:

- the same deployable roles as production: `api`, `worker`, `scheduler`, and `fixture_loader` if required
- protected promotion from `dev`
- production-shaped scheduler and queue behavior
- real staff auth, secret reads, and audit coverage
- replayable fixture loads with signature verification before a fixture watermark is published
- dashboards for deploy health, queue health, scheduler heartbeat, and shared-environment audit visibility

`staging` must not gain:

- live vendor credentials
- licensed raw market data
- open-ended vendor egress

### 6. Preview and local restrictions

Local and preview safety stays fixed:

- local uses synthetic fixtures only
- preview environments host UI and API slices only
- previews do not run full workers or schedulers
- previews do not receive shared secret-store access beyond low-risk application config needed for synthetic paths

## Exact Inputs BackendLead Must Land Under `TRAA-81`

Platform is ready to bind once the repo bootstrap supplies these repo-local facts:

1. The canonical repo path and default branch.
2. The chosen package manager and stable task entrypoints for install, lint, typecheck, test, build, and migrations.
3. Container build definitions for `api`, `worker`, and `scheduler`.
4. The local bootstrap path for synthetic fixtures.
5. The first service health-check contract for deploy validation.
6. The concrete application configuration schema for database, queue, object storage, auth, SSE, and telemetry.

Without those six inputs, Platform can finish the preflight but cannot wire CI and shared-environment deploy manifests honestly.

## Platform-Owned Prerequisites Already Clear

No new product or architecture decision is needed before repo bootstrap.

Platform can proceed on these assumptions immediately:

- CI trust is OIDC or workload identity only.
- Promotion is one signed artifact forward from `dev` to `staging`.
- Shared environments use real staff auth.
- `staging` is persistent and scheduler-shaped.
- Non-prod market-data handling stays fixture-only.
- Vendor egress outside prod stays denied by default.
- Deploy, secret-read, and privileged-access audit visibility are day-1 requirements, not later hardening work.

## Missing Versus Blocked

### Missing upstream inputs

- no canonical repo commit or checkout yet from `TRAA-81`
- no repo-local task runner contract
- no container build files
- no repo-local application config schema

### Not a platform blocker

These are upstream repo-bootstrap gaps, not platform-boundary blockers.

At the current scope, there is still no evidence that:

- `staging` needs live vendor credentials
- preview environments need full worker or scheduler execution
- CI must fall back to long-lived cloud keys
- the approved queue and scheduler posture is insufficient for the first repo-backed slice

## Recommended Next Action Split

### PlatformLead

- keep this note as the delivery contract for `TRAA-82`
- bind the CI workflow, shared-environment identities, secret namespaces, and staging deploy shape as soon as `TRAA-81` exposes the repo-local task runner and config surface

### BackendLead

- land the canonical repo bootstrap under `TRAA-81`
- make the root task runner and config schema explicit so CI and deploy manifests do not depend on out-of-band guessing

### CTO

- keep the current boundary intact: fixture-only non-prod, OIDC-only CI trust, and no vendor exceptions without a new blocker issue

## Bottom Line

`TRAA-82` can truthfully preflight the platform path now.

The remaining gap is not a missing platform decision. It is the still-unfinished repo bootstrap under `TRAA-81`, after which Platform can bind CI and shared-environment delivery to the real canonical codebase without inventing parallel scaffolding.
