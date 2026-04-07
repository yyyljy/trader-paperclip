# Phase 1 Workbench Delivery Readiness

## Objective

Turn the earlier platform baseline into the exact delivery contract needed for the first analyst workbench implementation push under [TRAA-39](/TRAA/issues/TRAA-39).

This note is intentionally narrower than `platform_baseline.md` and `phase1_identity_staging_credential_baseline.md`. It defines what must be true for BackendLead to start the first product-engineering slice against `local`, `dev`, and `staging` without waiting for live vendor integrations.

## Fixed Assumptions

- `local` remains synthetic and fast. No shared vendor credentials, no shared scheduler, no secret-manager dependency for normal onboarding.
- `dev` is the merge and contract-test environment. It uses real staff auth plus workload identities, but only synthetic or masked data.
- `staging` is persistent and production-shaped for auth, scheduler topology, deploy controls, secret access, and audit visibility, but it stays fixture-only for market-data inputs.
- `prod` is the only environment allowed to hold live vendor credentials, licensed market data, and vendor-connected automation.
- Preview environments stay stateless. They may host UI and API slices against synthetic backends, but they may not run full workers, schedulers, or vendor-connected jobs.
- The phase-1 runtime remains the lean `api` plus `worker` plus `scheduler` path already locked in `phase1_workflow_runtime_guardrails.md`.

## Implementation Readiness Contract

### 1. Local developer path

- One bootstrap path must stand up `api`, `worker`, and optional local scheduler stubs with seeded fixtures.
- Local auth may use stubbed or dev-only flows, but local behavior must preserve the same session and permission shape BackendLead defines for shared environments.
- Developers must be able to run the first source-triage and evidence-workspace slices without shared secrets.
- Fixture packs used locally should be the same logical fixture family that will be promoted into `staging`, even if the local copy is trimmed for speed.

### 2. Shared `dev` path

- `dev` must use real staff SSO before engineering onboarding expands.
- CI must deploy to `dev` through workload identity or OIDC only.
- `dev` must validate merged application code, contract changes, migrations, and environment wiring against synthetic or masked data.
- No licensed data, live vendor credentials, or vendor egress are allowed in `dev`.

### 3. Persistent `staging` path

- `staging` must be the first place where real staff auth, runtime workload identities, protected deploy promotion, secret reads, and audit logging are validated end to end.
- `staging` runs the same deployable roles as production: `api`, `worker`, `scheduler`, and `fixture_loader` if needed.
- Scheduled dry runs for workbench-adjacent flows should execute in `staging` on the same ET-based operating windows used by the runtime guardrails.
- Market-data inputs in `staging` stay replayable and fixture-backed. `fixture_loader` must verify signed promoted bundles before publishing a watermark, and no live vendor credentials are introduced unless a new blocker issue is opened.

## Week-1 Execution Order

### Step 1. Identity and secret boundary

- Lock the shared-environment staff SSO scope for `dev`, `staging`, and `prod`.
- Publish the first human-role and machine-identity map for `api`, `worker`, `scheduler`, `fixture_loader`, prod-only vendor connectors and exporter, CI deploy, observability read, and secret administration.
- Create per-environment secret namespaces and deny cross-environment secret reuse.

### Step 2. CI trust and promotion path

- Wire CI to cloud through OIDC or workload identity federation.
- Build once per commit, sign once, and promote the same artifact from `dev` to `staging`.
- Protect `staging` promotion behind explicit checks for tests, migrations, image scanning, secret scanning, and post-deploy health.

### Step 3. Staging topology for the first slice

- Stand up one persistent `staging` environment with the phase-1 runtime roles and production-like scheduler shape.
- Keep branch previews limited to UI and API slices only.
- Deny vendor-connected egress from previews, `local`, `dev`, and `staging`.

### Step 4. Observability and release safety

- Emit structured logs, metrics, traces, and audit events from every shared-environment runtime role.
- Bring up the minimum dashboards for platform health, queue health, deployment health, and the protected-window vendor-feed pages in `staging`.
- Wire the five vendor-boundary runbooks into the shared dashboard pages so responders can jump from page to runbook during market-open and close windows.
- Validate that deploys, privileged access, secret reads, and scheduled dry runs appear in audit output before the first broad engineering onboarding wave.

## Environment Expectations For The First Workbench Slice

| capability | `local` | `dev` | `staging` |
| --- | --- | --- | --- |
| staff auth path | stubbed or dev-only allowed | real SSO | real SSO |
| machine identity | developer-scoped only | workload identity | production-shaped workload identity |
| data source | synthetic fixtures | synthetic or masked fixtures | replayable market-data fixtures |
| scheduler shape | optional local stub | limited validation | real persistent scheduler |
| deploy path | local build | CI deploy | protected promotion from `dev` |
| audit coverage | optional | deploy and access audit | full shared-environment validation target |
| vendor credentials | not allowed | not allowed | not allowed |
| vendor egress | not allowed | not allowed | denied by default |

## Cross-Lead Handoffs

### BackendLead dependency

BackendLead in [TRAA-37](/TRAA/issues/TRAA-37) must supply:

- the shared-environment session and permission contract for the first workbench screens
- the application-layer RBAC seed and permission-denied behavior
- audit events for login, privilege-sensitive actions, review actions, and publish-gate changes
- health and readiness checks on the runtime roles so deploy promotion is automatable

Concrete reference:

- `phase1_workbench_rbac_session_permission_contract.md` locks the session states, role-grant seeds, and permission-denied envelope this environment work depends on.

This is a dependency for complete shared-environment hardening, but it does not block platform from locking the environment boundary now.

### DataPlatformLead dependency

DataPlatformLead in [TRAA-38](/TRAA/issues/TRAA-38) must supply:

- the replayable fixture packaging and refresh path for source, evidence, and lineage data
- the schema-hash and masking inputs needed for signed fixture manifests
- retention and lineage expectations for fixture artifacts in `dev` and `staging`
- storage-path boundaries for raw versus curated artifacts so secret and access policy stay correct

This is a dependency for high-confidence staging rehearsal, but it does not require live vendor integrations.

### CTO dependency

The CTO owns the cross-team hold line:

- keep the runtime on the lean path already approved
- reject any attempt to move live vendor credentials or licensed datasets into `staging` without opening a blocker
- enforce that initial product-engineering work proceeds against the approved primitive and workflow contracts rather than reopening UX scope

## Blocker Threshold

Open a blocker immediately if any of the following becomes true:

- `staging` needs live vendor credentials to unblock the first implementation slice
- branch previews are asked to run full scheduler or worker flows
- CI cannot deploy through workload identity or OIDC and would require long-lived cloud keys
- the chosen queue or scheduler path cannot expose the class-level visibility and replay controls already required by `phase1_workflow_runtime_guardrails.md`

## Current Readiness View

No blocker is visible at the current scope.

The workbench implementation can proceed on the approved path:

- real shared-environment auth now
- OIDC or workload-identity deploy trust now
- signed artifact promotion now
- persistent `staging` with production-shaped scheduler now
- fixture-only market-data boundary held until a later explicit decision

The remaining dependencies are coordination items with BackendLead and DataPlatformLead, not reasons to delay the first implementation slice.
