CREATE TABLE IF NOT EXISTS app_session (
  session_id UUID PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  auth_provider TEXT NOT NULL,
  auth_subject TEXT NOT NULL,
  environment TEXT NOT NULL,
  assurance_level TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  selected_desk TEXT NOT NULL,
  saved_view TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_grant (
  grant_id UUID PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  role_key TEXT NOT NULL,
  scope_kind TEXT NOT NULL,
  desk TEXT,
  coverage_entity_id UUID,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  grant_source TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_policy (
  policy_key TEXT PRIMARY KEY,
  desk TEXT NOT NULL,
  coverage_entity_id UUID,
  default_reviewer_role TEXT NOT NULL,
  default_required_approver_role TEXT NOT NULL,
  requires_research_lead_if_score_gte INTEGER,
  requires_research_lead_on_regulatory_flag BOOLEAN NOT NULL DEFAULT FALSE,
  requires_research_lead_on_event_risk_flag BOOLEAN NOT NULL DEFAULT FALSE,
  adds_parallel_macro_review_on_macro_shock BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit_event (
  event_id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  subject_actor_id UUID,
  role_key TEXT,
  scope_kind TEXT,
  desk TEXT,
  coverage_entity_id UUID,
  reason_code TEXT,
  correlation_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS event_outbox (
  event_id UUID PRIMARY KEY,
  sequence BIGSERIAL UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  channel_keys TEXT[] NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_version INTEGER NOT NULL,
  workflow_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS record_lock (
  lock_id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  holder_actor_id UUID NOT NULL,
  holder_actor_type TEXT NOT NULL,
  status TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS stale_state (
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT NOT NULL,
  reason_codes TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_type, entity_id)
);
