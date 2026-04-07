import { parseWebEnv } from "@trader-paperclip/config";
import { type BootstrapResponse, workbenchRouteKeys } from "@trader-paperclip/contracts";
import { useEffect, useState } from "react";

const env = parseWebEnv(import.meta.env as Record<string, string | boolean | undefined>);

const fallbackBootstrap: BootstrapResponse = {
  principal: {
    session_id: "fallback-session",
    actor: {
      actor_id: "actor-analysis-lead",
      actor_type: "human",
      display_name: "AnalysisLead",
      role_key: "analysis_lead"
    },
    auth_context: {
      provider: "local_stub",
      subject: "analysis.lead",
      assurance_level: "dev_stub",
      environment: "local",
      issued_at: "2026-04-08T11:00:00Z",
      expires_at: "2026-04-08T20:00:00Z"
    },
    role_assignments: [
      {
        role_key: "analysis_lead",
        scope_kind: "desk",
        desk: "cross_desk",
        coverage_entity_id: null,
        is_primary: true
      }
    ],
    preferences: {
      selected_desk: "cross_desk",
      saved_view: "pre_market",
      default_route: "triage"
    }
  },
  route_scope: {
    can_access_workbench: true,
    routes: {
      triage: true,
      drafts: true,
      review: true,
      session_board: true,
      packet_desk: true
    }
  },
  role_assignments: [
    {
      role_key: "analysis_lead",
      scope_kind: "desk",
      desk: "cross_desk",
      coverage_entity_id: null,
      is_primary: true
    }
  ],
  coverage_scopes: [],
  approval_policy_rows: [],
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
    default_route: "triage",
    saved_view: "pre_market",
    active_session_date: "2026-04-08",
    timezone: "America/New_York"
  },
  stream: {
    url: `${env.VITE_SSE_BASE_URL}/v1/events/stream?channels=me,desk:cross_desk`,
    heartbeat_interval_sec: 15,
    retry_ms: 2000,
    authorized_channels: ["me", "desk:cross_desk"]
  },
  freshness: {
    as_of_timestamp: "2026-04-08T12:00:00Z",
    session_date: "2026-04-08"
  }
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>(fallbackBootstrap);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadBootstrap = async () => {
      try {
        const response = await fetch(
          `${env.VITE_API_BASE_URL}/v1/workbench/bootstrap?session_id=session-analysis-lead`,
          {
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error(`Bootstrap request failed with ${response.status}`);
        }

        const payload = (await response.json()) as BootstrapResponse;
        setBootstrap(payload);
        setError(null);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Bootstrap request failed.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadBootstrap();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-block">
          <p className="eyebrow">Paperclip Phase 1</p>
          <h1>Paperclip Analyst Workbench</h1>
          <p className="lede">
            Dense desk workflows, server-owned permissions, and one replayable SSE stream.
          </p>
        </div>

        <div className="meta-block">
          <span className={bootstrap.route_scope.can_access_workbench ? "status-pill is-good" : "status-pill is-warn"}>
            {bootstrap.route_scope.can_access_workbench ? "Workbench Ready" : "Access Blocked"}
          </span>
          <p>{bootstrap.principal.actor.display_name}</p>
          <p>{bootstrap.principal.actor.role_key}</p>
        </div>

        <div className="meta-block">
          <p>{formatTimestamp(bootstrap.freshness.as_of_timestamp)}</p>
          <p>{bootstrap.shell_defaults.timezone}</p>
          <p>{bootstrap.principal.preferences.selected_desk}</p>
        </div>
      </header>

      {error ? (
        <section className="banner warning-banner" role="alert">
          <strong>Bootstrap fallback in use.</strong>
          <span>{error}</span>
        </section>
      ) : null}

      <main className="workspace-grid" aria-busy={loading}>
        <section className="surface surface-overview">
          <div className="surface-header">
            <div>
              <p className="eyebrow">Route Scope</p>
              <h2>Shell Access</h2>
            </div>
            <p className="surface-copy">
              The workbench surface stays server-driven. Roles, routes, and channels come from the bootstrap contract.
            </p>
          </div>

          <div className="metric-grid">
            <MetricCard label="Role Assignments" value={bootstrap.role_assignments.length} />
            <MetricCard label="Coverage Scopes" value={bootstrap.coverage_scopes.length} />
            <MetricCard label="Approval Policies" value={bootstrap.approval_policy_rows.length} />
            <MetricCard label="Authorized Channels" value={bootstrap.stream.authorized_channels.length} />
          </div>

          <div className="route-list">
            {workbenchRouteKeys.map((route) => (
              <article
                key={route}
                className={
                  route === bootstrap.shell_defaults.default_route
                    ? "route-card is-active"
                    : "route-card"
                }
              >
                <div>
                  <p className="eyebrow">Route</p>
                  <h3>{route.replaceAll("_", " ")}</h3>
                </div>
                <p>{bootstrap.route_scope.routes[route] ? "Granted in current scope" : "Hidden by policy"}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="surface">
          <div className="surface-header">
            <div>
              <p className="eyebrow">Session</p>
              <h2>Principal Context</h2>
            </div>
            <p className="surface-copy">The first local slice stays synthetic, but the session and policy shape matches the shared contract.</p>
          </div>

          <dl className="detail-grid">
            <div>
              <dt>Provider</dt>
              <dd>{bootstrap.principal.auth_context.provider}</dd>
            </div>
            <div>
              <dt>Session Date</dt>
              <dd>{bootstrap.shell_defaults.active_session_date}</dd>
            </div>
            <div>
              <dt>Saved View</dt>
              <dd>{bootstrap.principal.preferences.saved_view}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{formatTimestamp(bootstrap.principal.auth_context.expires_at)}</dd>
            </div>
          </dl>
        </section>

        <section className="surface">
          <div className="surface-header">
            <div>
              <p className="eyebrow">Realtime</p>
              <h2>SSE Contract</h2>
            </div>
            <p className="surface-copy">
              Replay stays explicit, channel-scoped, and aligned with the fixture-backed foundation package.
            </p>
          </div>

          <div className="service-list">
            <article className="service-card">
              <div className="service-row">
                <h3>stream url</h3>
                <span className="status-pill is-good">replayable</span>
              </div>
              <p>{bootstrap.stream.url}</p>
              <small>Retry {bootstrap.stream.retry_ms}ms, heartbeat {bootstrap.stream.heartbeat_interval_sec}s</small>
            </article>
            <article className="service-card">
              <div className="service-row">
                <h3>authorized channels</h3>
                <span className="status-pill is-good">{bootstrap.stream.authorized_channels.length}</span>
              </div>
              <p>{bootstrap.stream.authorized_channels.join(", ")}</p>
              <small>Derived from role grants, desk scope, and selected workbench context.</small>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard(props: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <p className="eyebrow">{props.label}</p>
      <strong>{props.value}</strong>
    </article>
  );
}

export default App;
