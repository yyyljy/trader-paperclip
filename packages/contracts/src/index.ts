export const applicationEnvironments = ["local", "dev", "staging", "prod"] as const;
export type EnvironmentName = (typeof applicationEnvironments)[number];
export type ActorType = "human" | "machine";
export type RoleKey =
  | "analyst"
  | "sector_lead"
  | "analysis_lead"
  | "research_lead"
  | "approver"
  | "admin"
  | "auditor"
  | "machine";

export const workbenchRouteKeys = ["triage", "drafts", "review", "session_board", "packet_desk"] as const;
export type WorkbenchRouteKey = (typeof workbenchRouteKeys)[number];

export type ErrorCode =
  | "authentication_required"
  | "session_expired"
  | "human_session_required"
  | "workbench_scope_missing"
  | "permission_denied"
  | "unauthorized_channel"
  | "invalid_stream_request"
  | "internal_server_error"
  | "event_replay_gap";

export interface ActorRef {
  actor_id: string;
  actor_type: ActorType;
  display_name: string;
  role_key: RoleKey;
}

export interface RoleRef {
  role_key: RoleKey;
  display_name: string;
}

export interface RoleAssignment {
  role_key: RoleKey;
  scope_kind: "global" | "desk" | "coverage_entity";
  desk: string | null;
  coverage_entity_id: string | null;
  is_primary: boolean;
}

export interface CoverageScope {
  coverage_entity_id: string;
  desk: string;
  subsector: string;
  coverage_tier: "tier_1" | "tier_2" | "tier_3" | string;
  primary_owner: ActorRef;
  backup_reviewer: ActorRef;
}

export interface ApprovalPolicyRow {
  policy_key: string;
  desk: string;
  coverage_entity_id: string | null;
  default_reviewer_role: RoleKey;
  default_required_approver_role: RoleKey;
  requires_research_lead_if_score_gte: number;
  requires_research_lead_on_regulatory_flag: boolean;
  requires_research_lead_on_event_risk_flag: boolean;
  adds_parallel_macro_review_on_macro_shock: boolean;
}

export interface AuthContext {
  provider: "local_stub" | "staff_sso";
  subject: string;
  assurance_level: "dev_stub" | "mfa";
  environment: EnvironmentName;
  issued_at: string;
  expires_at: string;
}

export interface PrincipalSession {
  session_id: string;
  actor: ActorRef;
  auth_context: AuthContext;
  role_assignments: RoleAssignment[];
  preferences: {
    selected_desk: string;
    saved_view: string;
    default_route: WorkbenchRouteKey;
  };
}

export interface RouteScope {
  can_access_workbench: boolean;
  routes: Record<WorkbenchRouteKey, boolean>;
}

export interface FeatureFlags {
  triage_board: boolean;
  draft_workspace: boolean;
  review_queue: boolean;
  session_board: boolean;
  packet_desk: boolean;
  diff_modal: boolean;
  sse_replay: boolean;
}

export type WorkbenchFeatureFlags = FeatureFlags;

export interface ShellDefaults {
  default_route: WorkbenchRouteKey;
  saved_view: string;
  active_session_date: string;
  timezone: string;
}

export interface StreamMetadata {
  url: string;
  heartbeat_interval_sec: number;
  retry_ms: number;
  authorized_channels: string[];
}

export interface FreshnessMetadata {
  as_of_timestamp: string;
  session_date: string;
}

export interface BootstrapResponse {
  principal: PrincipalSession;
  route_scope: RouteScope;
  role_assignments: RoleAssignment[];
  coverage_scopes: CoverageScope[];
  approval_policy_rows: ApprovalPolicyRow[];
  feature_flags: FeatureFlags;
  shell_defaults: ShellDefaults;
  stream: StreamMetadata;
  freshness: FreshnessMetadata;
}

export interface ErrorEnvelope {
  error: ErrorCode;
  message?: string;
  action?: string;
  [key: string]: unknown;
}

export type StreamEventType =
  | "assignment.updated"
  | "review_state.updated"
  | "lock.changed"
  | "stale_state.updated";

export interface OutboxEventEnvelope {
  id: string;
  type: StreamEventType;
  occurred_at: string;
  sequence: number;
  workflow_id: string;
  correlation_id: string;
  entity: {
    entity_type: "report" | "recommendation" | "source_ref";
    entity_id: string;
    version: number;
  };
  actor: ActorRef;
  payload: Record<string, unknown>;
  channel_keys: string[];
}

export interface EventOutboxRow {
  event_id: string;
  sequence: number;
  event_type: StreamEventType;
  channel_keys: string[];
  entity_type: string;
  entity_id: string;
  entity_version: number;
  workflow_id: string;
  correlation_id: string;
  actor_id: string;
  actor_type: ActorType;
  payload_json: Record<string, unknown>;
  occurred_at: string;
  committed_at: string;
}

export interface EventEnvelope {
  id: string;
  sequence: number;
  event_type: StreamEventType;
  channel_keys: string[];
  entity_type: string;
  entity_id: string;
  entity_version: number;
  workflow_id: string;
  correlation_id: string;
  actor: {
    actor_id: string;
    actor_type: ActorType;
  };
  occurred_at: string;
  committed_at: string;
  payload: Record<string, unknown>;
}

export interface AuditEvent {
  event_id: string;
  event_type: string;
  actor_id: string;
  actor_type: ActorType;
  occurred_at: string;
  payload: Record<string, unknown>;
}

export interface LockRecord {
  lock_id: string;
  entity_type: string;
  entity_id: string;
  owner: ActorRef;
  acquired_at: string;
  expires_at: string;
  status: "active" | "stale" | "released" | "taken_over";
  takeover_eligible: boolean;
  takeover_reason: string | null;
}

export interface StaleStateRecord {
  entity_type: string;
  entity_id: string;
  client_version: number;
  server_version: number;
  base_revision_id: string;
  head_revision_id: string;
  diff_url: string;
}
