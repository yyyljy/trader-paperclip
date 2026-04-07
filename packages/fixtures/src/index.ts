import type {
  ActorRef,
  ApprovalPolicyRow,
  BootstrapResponse,
  CoverageScope,
  EnvironmentName,
  ErrorCode,
  ErrorEnvelope,
  OutboxEventEnvelope,
  PrincipalSession,
  RoleAssignment,
  RoleKey
} from "@trader-paperclip/contracts";

const coverageIds = {
  nvda: "coverage-nvda",
  msft: "coverage-msft"
} as const;

const actors: Record<RoleKey, ActorRef> = {
  analyst: {
    actor_id: "actor-analyst",
    actor_type: "human",
    display_name: "Analyst A",
    role_key: "analyst"
  },
  sector_lead: {
    actor_id: "actor-sector-lead",
    actor_type: "human",
    display_name: "TMT Lead",
    role_key: "sector_lead"
  },
  analysis_lead: {
    actor_id: "actor-analysis-lead",
    actor_type: "human",
    display_name: "AnalysisLead",
    role_key: "analysis_lead"
  },
  research_lead: {
    actor_id: "actor-research-lead",
    actor_type: "human",
    display_name: "ResearchLead",
    role_key: "research_lead"
  },
  approver: {
    actor_id: "actor-approver",
    actor_type: "human",
    display_name: "NamedApprover",
    role_key: "approver"
  },
  admin: {
    actor_id: "actor-admin",
    actor_type: "human",
    display_name: "Admin",
    role_key: "admin"
  },
  auditor: {
    actor_id: "actor-auditor",
    actor_type: "human",
    display_name: "AuditReader",
    role_key: "auditor"
  },
  machine: {
    actor_id: "actor-machine",
    actor_type: "machine",
    display_name: "FixtureWorker",
    role_key: "machine"
  }
};

const coverageScopes: CoverageScope[] = [
  {
    coverage_entity_id: coverageIds.nvda,
    desk: "TMT",
    subsector: "Semis",
    coverage_tier: "tier_1",
    primary_owner: actors.analyst,
    backup_reviewer: actors.analysis_lead
  },
  {
    coverage_entity_id: coverageIds.msft,
    desk: "TMT",
    subsector: "Software",
    coverage_tier: "tier_1",
    primary_owner: actors.sector_lead,
    backup_reviewer: actors.analysis_lead
  }
];

const approvalPolicyRows: ApprovalPolicyRow[] = [
  {
    policy_key: "tmt_default",
    desk: "TMT",
    coverage_entity_id: null,
    default_reviewer_role: "sector_lead",
    default_required_approver_role: "analysis_lead",
    requires_research_lead_if_score_gte: 4,
    requires_research_lead_on_regulatory_flag: true,
    requires_research_lead_on_event_risk_flag: true,
    adds_parallel_macro_review_on_macro_shock: true
  }
];

const roleAssignments: Record<RoleKey, RoleAssignment[]> = {
  analyst: [
    {
      role_key: "analyst",
      scope_kind: "coverage_entity",
      desk: "TMT",
      coverage_entity_id: coverageIds.nvda,
      is_primary: true
    }
  ],
  sector_lead: [
    {
      role_key: "sector_lead",
      scope_kind: "desk",
      desk: "TMT",
      coverage_entity_id: null,
      is_primary: true
    }
  ],
  analysis_lead: [
    {
      role_key: "analysis_lead",
      scope_kind: "desk",
      desk: "cross_desk",
      coverage_entity_id: null,
      is_primary: true
    }
  ],
  research_lead: [
    {
      role_key: "research_lead",
      scope_kind: "desk",
      desk: "cross_desk",
      coverage_entity_id: null,
      is_primary: true
    }
  ],
  approver: [
    {
      role_key: "approver",
      scope_kind: "desk",
      desk: "TMT",
      coverage_entity_id: null,
      is_primary: true
    }
  ],
  admin: [
    {
      role_key: "admin",
      scope_kind: "global",
      desk: null,
      coverage_entity_id: null,
      is_primary: true
    }
  ],
  auditor: [
    {
      role_key: "auditor",
      scope_kind: "global",
      desk: null,
      coverage_entity_id: null,
      is_primary: true
    }
  ],
  machine: [
    {
      role_key: "machine",
      scope_kind: "global",
      desk: null,
      coverage_entity_id: null,
      is_primary: true
    }
  ]
};

const routeAccess: Record<RoleKey, BootstrapResponse["route_scope"]["routes"]> = {
  analyst: {
    triage: true,
    drafts: true,
    review: false,
    session_board: true,
    packet_desk: false
  },
  sector_lead: {
    triage: true,
    drafts: true,
    review: true,
    session_board: true,
    packet_desk: false
  },
  analysis_lead: {
    triage: true,
    drafts: true,
    review: true,
    session_board: true,
    packet_desk: true
  },
  research_lead: {
    triage: true,
    drafts: true,
    review: true,
    session_board: true,
    packet_desk: true
  },
  approver: {
    triage: false,
    drafts: false,
    review: true,
    session_board: true,
    packet_desk: true
  },
  admin: {
    triage: true,
    drafts: true,
    review: true,
    session_board: true,
    packet_desk: true
  },
  auditor: {
    triage: true,
    drafts: false,
    review: false,
    session_board: true,
    packet_desk: false
  },
  machine: {
    triage: false,
    drafts: false,
    review: false,
    session_board: false,
    packet_desk: false
  }
};

export const resolvePrincipalSession = ({
  roleKey = "analysis_lead",
  actorType,
  environment,
  fallbackEnvironment = "local"
}: {
  roleKey?: RoleKey;
  actorType?: "human" | "machine";
  environment?: EnvironmentName;
  fallbackEnvironment?: EnvironmentName;
}): PrincipalSession => {
  const actor = actorType === "machine" ? actors.machine : actors[roleKey];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  return {
    session_id: `session-${actor.actor_id}`,
    actor,
    auth_context: {
      provider: fallbackEnvironment === "local" ? "local_stub" : "staff_sso",
      subject: `subject-${actor.actor_id}`,
      assurance_level: fallbackEnvironment === "local" ? "dev_stub" : "mfa",
      environment: environment ?? fallbackEnvironment,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    },
    role_assignments: roleAssignments[actor.role_key],
    preferences: {
      selected_desk: actor.role_key === "analysis_lead" || actor.role_key === "research_lead" ? "cross_desk" : "TMT",
      saved_view: "pre_market",
      default_route: routeAccess[actor.role_key].triage ? "triage" : "review"
    }
  };
};

export const getAuthorizedChannels = (session: PrincipalSession) => {
  const channels = new Set<string>(["me"]);

  for (const assignment of session.role_assignments) {
    if (assignment.desk) {
      channels.add(`desk:${assignment.desk}`);
    }

    if (assignment.scope_kind === "global") {
      channels.add("desk:TMT");
      channels.add("coverage_entity:coverage-nvda");
      channels.add("coverage_entity:coverage-msft");
    }

    if (assignment.coverage_entity_id) {
      channels.add(`coverage_entity:${assignment.coverage_entity_id}`);
    }
  }

  return [...channels];
};

export const makeBootstrapPayload = ({
  session,
  apiBaseUrl
}: {
  session: PrincipalSession;
  apiBaseUrl: string;
}): BootstrapResponse => {
  const routes = routeAccess[session.actor.role_key];
  const activeSessionDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  return {
    principal: session,
    route_scope: {
      can_access_workbench: Object.values(routes).some(Boolean),
      routes
    },
    role_assignments: session.role_assignments,
    coverage_scopes:
      session.actor.role_key === "analyst"
        ? coverageScopes.filter((scope) => scope.coverage_entity_id === coverageIds.nvda)
        : coverageScopes,
    approval_policy_rows: approvalPolicyRows,
    feature_flags: {
      triage_board: true,
      draft_workspace: true,
      review_queue: true,
      session_board: true,
      packet_desk: true,
      diff_modal: true,
      sse_replay: true
    },
    shell_defaults: {
      default_route: session.preferences.default_route,
      saved_view: session.preferences.saved_view,
      active_session_date: activeSessionDate,
      timezone: "America/New_York"
    },
    stream: {
      url: `${apiBaseUrl}/v1/events/stream?channels=${getAuthorizedChannels(session).join(",")}`,
      heartbeat_interval_sec: 15,
      retry_ms: 2000,
      authorized_channels: getAuthorizedChannels(session)
    },
    freshness: {
      as_of_timestamp: new Date().toISOString(),
      session_date: activeSessionDate
    }
  };
};

export const seededOutboxEvents: OutboxEventEnvelope[] = [
  {
    id: "evt-assignment",
    type: "assignment.updated",
    occurred_at: "2026-04-08T06:35:00Z",
    sequence: 410,
    workflow_id: "wf-1",
    correlation_id: "corr-1",
    entity: {
      entity_type: "source_ref",
      entity_id: "source-1",
      version: 3
    },
    actor: actors.sector_lead,
    payload: {
      previous_owner: actors.analyst,
      owner: actors.sector_lead,
      reviewer: actors.analysis_lead,
      reason: "earnings_coverage_rebalance"
    },
    channel_keys: ["me", "desk:TMT"]
  },
  {
    id: "evt-review",
    type: "review_state.updated",
    occurred_at: "2026-04-08T06:39:00Z",
    sequence: 411,
    workflow_id: "wf-2",
    correlation_id: "corr-2",
    entity: {
      entity_type: "report",
      entity_id: "report-1",
      version: 7
    },
    actor: actors.analysis_lead,
    payload: {
      from_status: "draft",
      to_status: "in_review",
      required_approver: {
        role_key: "analysis_lead",
        display_name: "AnalysisLead"
      },
      blocking_reasons: []
    },
    channel_keys: ["me", "desk:TMT", "coverage_entity:coverage-nvda"]
  },
  {
    id: "evt-lock",
    type: "lock.changed",
    occurred_at: "2026-04-08T06:44:00Z",
    sequence: 412,
    workflow_id: "wf-3",
    correlation_id: "corr-3",
    entity: {
      entity_type: "report",
      entity_id: "report-1",
      version: 7
    },
    actor: actors.sector_lead,
    payload: {
      lock_status: "active",
      lock_owner: actors.sector_lead,
      takeover_eligible: false
    },
    channel_keys: ["me", "desk:TMT"]
  },
  {
    id: "evt-stale",
    type: "stale_state.updated",
    occurred_at: "2026-04-08T06:47:00Z",
    sequence: 413,
    workflow_id: "wf-4",
    correlation_id: "corr-4",
    entity: {
      entity_type: "recommendation",
      entity_id: "rec-1",
      version: 9
    },
    actor: actors.analysis_lead,
    payload: {
      client_version: 7,
      server_version: 9,
      diff_url: "/v1/recommendations/rec-1/diff?from=rev-7&to=rev-9"
    },
    channel_keys: ["me", "desk:cross_desk", "coverage_entity:coverage-msft"]
  }
];

export const makeErrorEnvelope = (
  error: ErrorCode,
  action: string,
  message = "The current request cannot be completed."
): ErrorEnvelope => ({
  error,
  action,
  message
});
