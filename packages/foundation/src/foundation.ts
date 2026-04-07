import type {
  BootstrapResponse,
  CoverageScope,
  ErrorEnvelope,
  PrincipalSession,
  RoleAssignment,
  RoleKey,
  WorkbenchRouteKey,
} from "@trader-paperclip/contracts";

import type { CoverageEntityRecord, EntityScopeRecord, FixtureDataset, RoleGrant } from "./fixtures.js";

const WORKBENCH_ROUTES: WorkbenchRouteKey[] = ["triage", "drafts", "review", "session_board", "packet_desk"];

export class FoundationError extends Error {
  readonly status: number;
  readonly body: ErrorEnvelope;

  constructor(status: number, body: ErrorEnvelope) {
    super(body.error);
    this.status = status;
    this.body = body;
  }
}

function activeGrant(grant: RoleGrant, nowIso: string) {
  if (grant.status !== "active") return false;
  if (grant.starts_at && grant.starts_at > nowIso) return false;
  if (grant.ends_at && grant.ends_at <= nowIso) return false;
  return true;
}

function roleAllows(route: WorkbenchRouteKey, roleKey: RoleKey) {
  switch (route) {
    case "triage":
      return roleKey !== "machine";
    case "drafts":
      return ["analyst", "sector_lead", "analysis_lead", "research_lead", "admin"].includes(roleKey);
    case "review":
      return ["sector_lead", "analysis_lead", "research_lead", "approver", "admin"].includes(roleKey);
    case "session_board":
      return roleKey !== "machine";
    case "packet_desk":
      return ["sector_lead", "analysis_lead", "research_lead", "approver", "admin"].includes(roleKey);
    default:
      return false;
  }
}

function dedupe<T extends string>(values: T[]) {
  return [...new Set(values)];
}

function grantsForActor(dataset: FixtureDataset, actorId: string, nowIso: string) {
  return dataset.role_grants.filter((grant) => grant.actor_id === actorId && activeGrant(grant, nowIso));
}

function hasDeskScope(grants: RoleGrant[], desk: string) {
  return grants.some((grant) => {
    if (grant.scope_kind === "global") return true;
    if (grant.scope_kind !== "desk") return false;
    return grant.desk === desk || grant.desk === "cross_desk";
  });
}

function canReadScope(grants: RoleGrant[], scope: EntityScopeRecord) {
  if (grants.some((grant) => grant.scope_kind === "global")) return true;

  if (scope.coverage_entity_id) {
    const hasCoverageGrant = grants.some(
      (grant) => grant.scope_kind === "coverage_entity" && grant.coverage_entity_id === scope.coverage_entity_id,
    );
    if (hasCoverageGrant) return true;
  }

  if (scope.desk) {
    return hasDeskScope(grants, scope.desk);
  }

  return false;
}

export function resolveSession(dataset: FixtureDataset, sessionId: string, now = new Date()) {
  const session = dataset.sessions.find((candidate) => candidate.session_id === sessionId);
  if (!session) {
    throw new FoundationError(401, {
      error: "authentication_required",
      message: `Unknown session: ${sessionId}`,
    });
  }

  if (new Date(session.auth_context.expires_at) <= now) {
    throw new FoundationError(401, {
      error: "session_expired",
      message: `Session ${sessionId} has expired`,
    });
  }

  return session;
}

export function resolveHumanSession(dataset: FixtureDataset, sessionId: string, now = new Date()) {
  const session = resolveSession(dataset, sessionId, now);

  if (session.actor.actor_type !== "human") {
    throw new FoundationError(403, {
      error: "human_session_required",
      message: "Machine principals cannot open the workbench shell or analyst SSE stream",
    });
  }

  return session;
}

function resolveRoleAssignments(dataset: FixtureDataset, principal: PrincipalSession, nowIso: string) {
  const grants = grantsForActor(dataset, principal.actor.actor_id, nowIso);
  const assignments: RoleAssignment[] = grants.map((grant) => ({
    role_key: grant.role_key,
    scope_kind: grant.scope_kind,
    desk: grant.desk,
    coverage_entity_id: grant.coverage_entity_id,
    is_primary: grant.is_primary,
  }));

  if (assignments.length === 0) {
    throw new FoundationError(403, {
      error: "workbench_scope_missing",
      message: "The authenticated actor has no active workbench-visible grants",
    });
  }

  return { assignments, grants };
}

function resolveCoverageScopes(dataset: FixtureDataset, grants: RoleGrant[]) {
  return dataset.coverage_entities
    .filter((scope) => {
      if (grants.some((grant) => grant.scope_kind === "global")) {
        return true;
      }

      if (grants.some((grant) => grant.scope_kind === "desk" && (grant.desk === scope.desk || grant.desk === "cross_desk"))) {
        return true;
      }

      return grants.some(
        (grant) => grant.scope_kind === "coverage_entity" && grant.coverage_entity_id === scope.coverage_entity_id,
      );
    })
    .map((scope): CoverageScope => scope);
}

function resolveApprovalPolicies(dataset: FixtureDataset, grants: RoleGrant[]) {
  return dataset.approval_policy_rows.filter((policy) => {
    if (policy.coverage_entity_id) {
      return grants.some((grant) => grant.coverage_entity_id === policy.coverage_entity_id);
    }

    return hasDeskScope(grants, policy.desk);
  });
}

function resolveRoutes(grants: RoleGrant[]) {
  const roleKeys = dedupe(grants.map((grant) => grant.role_key));
  const routes = Object.fromEntries(
    WORKBENCH_ROUTES.map((route) => [route, roleKeys.some((roleKey) => roleAllows(route, roleKey))]),
  ) as Record<WorkbenchRouteKey, boolean>;

  return {
    can_access_workbench: Object.values(routes).some(Boolean),
    routes,
  };
}

export function resolveAuthorizedChannels(
  grants: RoleGrant[],
  principal: PrincipalSession,
  coverageScopes: CoverageEntityRecord[],
) {
  const channels = ["me"];

  for (const grant of grants) {
    if (grant.scope_kind === "desk" && grant.desk) {
      channels.push(`desk:${grant.desk}`);
    }

    if (grant.scope_kind === "coverage_entity" && grant.coverage_entity_id) {
      channels.push(`coverage_entity:${grant.coverage_entity_id}`);
    }
  }

  for (const scope of coverageScopes) {
    channels.push(`desk:${scope.desk}`);
    channels.push(`coverage_entity:${scope.coverage_entity_id}`);
  }

  if (principal.preferences.selected_desk) {
    channels.push(`desk:${principal.preferences.selected_desk}`);
  }

  return dedupe(channels);
}

function defaultStreamUrl(authorizedChannels: string[]) {
  const preferredChannels = authorizedChannels.includes("desk:cross_desk")
    ? ["me", "desk:cross_desk"]
    : authorizedChannels.slice(0, 2);

  return `/v1/events/stream?channels=${preferredChannels.join(",")}`;
}

export function buildBootstrapResponse(dataset: FixtureDataset, sessionId: string, now = new Date()): BootstrapResponse {
  const principal = resolveHumanSession(dataset, sessionId, now);
  const nowIso = now.toISOString();
  const { assignments, grants } = resolveRoleAssignments(dataset, principal, nowIso);
  const coverageScopes = resolveCoverageScopes(dataset, grants);
  const authorizedChannels = resolveAuthorizedChannels(grants, principal, coverageScopes);
  const approvalPolicies = resolveApprovalPolicies(dataset, grants);
  const routeScope = resolveRoutes(grants);

  if (!routeScope.can_access_workbench) {
    throw new FoundationError(403, {
      error: "workbench_scope_missing",
      message: "The authenticated actor has no route-level workbench access",
    });
  }

  return {
    principal,
    route_scope: routeScope,
    role_assignments: assignments,
    coverage_scopes: coverageScopes,
    approval_policy_rows: approvalPolicies,
    feature_flags: dataset.feature_flags,
    shell_defaults: {
      default_route: principal.preferences.default_route,
      saved_view: principal.preferences.saved_view,
      active_session_date: dataset.metadata.session_date,
      timezone: dataset.metadata.timezone,
    },
    stream: {
      url: defaultStreamUrl(authorizedChannels),
      heartbeat_interval_sec: dataset.metadata.heartbeat_interval_sec,
      retry_ms: dataset.metadata.retry_ms,
      authorized_channels: authorizedChannels,
    },
    freshness: {
      as_of_timestamp: dataset.metadata.as_of_timestamp,
      session_date: dataset.metadata.session_date,
    },
  };
}

export function ensureRequestedChannels(
  dataset: FixtureDataset,
  principal: PrincipalSession,
  requestedChannels: string[],
  now = new Date(),
) {
  const grants = grantsForActor(dataset, principal.actor.actor_id, now.toISOString());
  const coverageScopes = resolveCoverageScopes(dataset, grants);
  const authorizedChannels = resolveAuthorizedChannels(grants, principal, coverageScopes);

  for (const channel of requestedChannels) {
    if (channel === "me") continue;
    if (authorizedChannels.includes(channel)) continue;

    const [scope, scopeId, nestedId] = channel.split(":");
    if (scope === "entity" && scopeId && nestedId) {
      const entityScope = dataset.entity_scope_index.find(
        (entity) => entity.entity_type === scopeId && entity.entity_id === nestedId,
      );

      if (entityScope && canReadScope(grants, entityScope)) {
        continue;
      }
    }

    throw new FoundationError(403, {
      error: "unauthorized_channel",
      message: `Channel ${channel} is not available to ${principal.actor.display_name}`,
      requested_channel: channel,
    });
  }
}

export function summarizeFoundation(dataset: FixtureDataset) {
  const eventTypes = dataset.outbox_events.reduce<Record<string, number>>((summary, event) => {
    summary[event.event_type] = (summary[event.event_type] ?? 0) + 1;
    return summary;
  }, {});

  return {
    sessions: dataset.sessions.length,
    grants: dataset.role_grants.length,
    coverage_scopes: dataset.coverage_entities.length,
    approval_policies: dataset.approval_policy_rows.length,
    outbox_events: dataset.outbox_events.length,
    locks: dataset.locks.length,
    stale_states: dataset.stale_states.length,
    event_types: eventTypes,
  };
}
