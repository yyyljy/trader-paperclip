# Environment Contract

This repo keeps one explicit configuration surface for `local`, `dev`, `staging`, and `prod`.

## Shared runtime variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | no | runtime marker: `development`, `test`, `production` |
| `APP_ENV` | no | application environment: `local`, `dev`, `staging`, `prod` |
| `APP_VERSION` | no | surfaced by API, worker, and scheduler health responses |
| `LOG_LEVEL` | no | service log level |
| `HOST` | no | bind host for the current runtime |
| `PORT` | no | bind port for the current runtime |
| `HEALTHCHECK_PATH` | no | health endpoint path |
| `READINESS_PATH` | no | readiness endpoint path |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no | telemetry exporter endpoint |

## API variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | no | primary database connection string |
| `QUEUE_DATABASE_URL` | no | queue or outbox database override; defaults to `DATABASE_URL` |
| `OBJECT_STORAGE_BUCKET` | no | object-store bucket name |
| `OBJECT_STORAGE_REGION` | no | object-store region marker |
| `AUTH_ISSUER` | no | staff-auth issuer |
| `AUTH_AUDIENCE` | no | staff-auth audience |
| `API_PUBLIC_BASE_URL` | no | public API base URL |
| `SSE_PUBLIC_BASE_URL` | no | public SSE base URL |

## Web variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_APP_ENV` | no | workbench shell environment marker |
| `VITE_API_BASE_URL` | no | API origin used by the web shell |
| `VITE_SSE_BASE_URL` | no | SSE origin used by the web shell |
| `VITE_APP_VERSION` | no | surfaced in the client build |

## Local defaults

- `api`: `HOST=0.0.0.0`, `PORT=4000`
- `worker`: `HOST=0.0.0.0`, `PORT=4100`
- `scheduler`: `HOST=0.0.0.0`, `PORT=4200`
- `web`: `VITE_API_BASE_URL=http://localhost:4000`, `VITE_SSE_BASE_URL=http://localhost:4000`

## Posture by environment

- `local`: fixture-only, no live vendors, no shared secret-manager dependency
- `dev`: real staff auth plus workload identity, synthetic or masked fixtures only
- `staging`: persistent and production-shaped for auth and runtime controls, still fixture-only for market data
- `prod`: only environment permitted to materialize live vendor credentials

The checked-in `.env.example` is the canonical starting point for local bootstrap.
