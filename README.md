# trader-paperclip

Canonical implementation repository for Paperclip's multi-agent stock market prediction service.

## Status

This repository was empty when it was linked into Paperclip. The first commit seeds the repo with the approved product and engineering documents that currently define the implementation contract.

This is intentionally honest:

- there is no hidden application scaffold
- there is no runnable backend or frontend yet
- the managed spec pack is the current source of truth until the first executable slices land

## What This Initial Commit Contains

- `docs/managed-spec-pack/`: approved architecture, delivery, and repo-triage documents copied from the managed Paperclip project workspace
- `docs/README.md`: index of the seeded documents and what each one is for
- `.gitignore`: baseline ignores for the expected Node and TypeScript toolchain

## Immediate Next Engineering Slices

1. Create the canonical repo structure for `api`, `worker`, `scheduler`, and the workbench web client.
2. Lock one stable task runner and package-manager interface for install, lint, typecheck, test, build, and migrations.
3. Land the first backend foundation slice centered on `GET /v1/workbench/bootstrap`, session and RBAC resolution, audit envelope baseline, lock or stale-state support, and SSE wiring.
4. Hand a stable repo path and branch to product engineering so the first workbench shell can start without another routing pass.

## Planned Repository Shape

```text
trader-paperclip/
  apps-or-services/
    api/
    worker/
    scheduler/
    web/
  packages/
  docs/
```

The exact workspace layout is still owned by the follow-on backend bootstrap work. This commit exists to establish the canonical repo and preserve the approved implementation context in-repo.
