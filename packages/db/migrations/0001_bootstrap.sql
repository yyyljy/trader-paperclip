CREATE TABLE IF NOT EXISTS principal_session (
  session_id UUID PRIMARY KEY,
  actor_id UUID NOT NULL,
  auth_provider TEXT NOT NULL,
  auth_subject TEXT NOT NULL,
  environment TEXT NOT NULL,
  assurance_level TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  selected_desk TEXT NOT NULL,
  saved_view TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_grant (
  grant_id UUID PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  role_key TEXT NOT NULL,
  scope_kind TEXT NOT NULL,
  desk TEXT NULL,
  coverage_entity_id UUID NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  grant_source TEXT NOT NULL,
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL,
  created_by UUID NULL,
  updated_by UUID NULL
);

CREATE TABLE IF NOT EXISTS approval_policy (
  policy_key TEXT PRIMARY KEY,
  desk TEXT NOT NULL,
  coverage_entity_id UUID NULL,
  default_reviewer_role TEXT NOT NULL,
  default_required_approver_role TEXT NOT NULL,
  requires_research_lead_if_score_gte INTEGER NOT NULL,
  requires_research_lead_on_regulatory_flag BOOLEAN NOT NULL,
  requires_research_lead_on_event_risk_flag BOOLEAN NOT NULL,
  adds_parallel_macro_review_on_macro_shock BOOLEAN NOT NULL
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
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
