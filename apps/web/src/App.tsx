import { parseWebEnv } from "@trader-paperclip/config";
import {
  type BootstrapResponse,
  type ErrorEnvelope,
  type WorkbenchRouteKey,
  workbenchRouteKeys
} from "@trader-paperclip/contracts";
import { useEffect, useState } from "react";
import {
  alerts,
  fallbackBootstrap,
  routeCopy,
  routeLayouts,
  type AlertRecord,
  type NonEmptyArray,
  type Tone
} from "./workbenchData";

const env = parseWebEnv(import.meta.env as Record<string, string | boolean | undefined>);

type BlockingStateKind = "signed_out" | "expired" | "access_denied" | "boundary_error";

interface BlockingState {
  kind: BlockingStateKind;
  title: string;
  body: string;
  actionLabel?: string;
  support?: string;
}

interface BannerState {
  title: string;
  body: string;
}

const initialSelectedIds: Record<WorkbenchRouteKey, string> = {
  triage: routeLayouts.triage.items[0].id,
  drafts: routeLayouts.drafts.items[0].id,
  review: routeLayouts.review.items[0].id,
  session_board: routeLayouts.session_board.items[0].id,
  packet_desk: routeLayouts.packet_desk.items[0].id
};

function resolvePreferredRoute(bootstrap: BootstrapResponse): WorkbenchRouteKey {
  return (
    workbenchRouteKeys.find((routeKey) => bootstrap.route_scope.routes[routeKey]) ??
    bootstrap.shell_defaults.default_route
  );
}

function resolveBootstrapRoute(bootstrap: BootstrapResponse): WorkbenchRouteKey {
  return bootstrap.route_scope.routes[bootstrap.shell_defaults.default_route]
    ? bootstrap.shell_defaults.default_route
    : resolvePreferredRoute(bootstrap);
}

function mapBlockingState(status: number, envelope: Partial<ErrorEnvelope> | null): BlockingState | null {
  if (status === 401 && envelope?.error === "session_expired") {
    return { kind: "expired", title: "Session expired", body: "Your workbench session ended. Sign in again to continue.", actionLabel: "Sign in again" };
  }

  if (status === 401) {
    return { kind: "signed_out", title: "Sign in required", body: "You need an active workbench session to open the analyst desk.", actionLabel: "Sign in" };
  }

  if (status === 403 && envelope?.error === "workbench_scope_missing") {
    return {
      kind: "access_denied",
      title: "Workbench access not granted",
      body: "You are signed in, but your current account does not have workbench scope in this environment.",
      support: "If you should have access, ask BackendLead or PlatformLead to verify your active role grants."
    };
  }

  if (status === 403 && envelope?.error === "human_session_required") {
    return { kind: "boundary_error", title: "Human session required", body: "This route cannot open from a machine-only session.", actionLabel: "Reload shell" };
  }

  return null;
}

function selectOrFallback<T extends { id: string }>(items: NonEmptyArray<T>, id: string): T {
  return items.find((item) => item.id === id) ?? items[0];
}

function getAlertCounts(records: readonly AlertRecord[]) {
  return {
    open: records.filter((record) => record.status !== "linked").length,
    urgent: records.filter((record) => record.status === "escalated").length,
    degraded: records.filter((record) => record.freshness !== "healthy").length
  };
}

function getPrimaryAlertAction(alert: AlertRecord) {
  if (alert.status === "new") {
    return "Acknowledge";
  }

  if (alert.requiresIntradayUpdate && alert.status !== "linked") {
    return "Create or Link Intraday Update";
  }

  return alert.status === "linked" ? "Open Linked Work" : "Link Source";
}

function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>(fallbackBootstrap);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [blockingState, setBlockingState] = useState<BlockingState | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<WorkbenchRouteKey>(fallbackBootstrap.shell_defaults.default_route);
  const [selectedIds, setSelectedIds] = useState<Record<WorkbenchRouteKey, string>>(initialSelectedIds);
  const [expandedAlerts, setExpandedAlerts] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(alerts[0].id);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBootstrap() {
      try {
        const response = await fetch(`${env.VITE_API_BASE_URL}/v1/workbench/bootstrap?session_id=session-analysis-lead`, { signal: controller.signal });

        if (!response.ok) {
          let envelope: Partial<ErrorEnvelope> | null = null;

          try {
            envelope = (await response.json()) as Partial<ErrorEnvelope>;
          } catch {
            envelope = null;
          }

          const mapped = mapBlockingState(response.status, envelope);

          if (mapped) {
            setBlockingState(mapped);
            setBanner(null);
            return;
          }

          throw new Error(envelope?.message ?? `Bootstrap request failed with ${response.status}`);
        }

        const payload = (await response.json()) as BootstrapResponse;

        if (controller.signal.aborted) {
          return;
        }

        setBootstrap(payload);
        setSelectedRoute(resolveBootstrapRoute(payload));
        setBlockingState(
          payload.route_scope.can_access_workbench
            ? null
            : {
                kind: "access_denied",
                title: "Workbench access not granted",
                body: "You are signed in, but your current account does not have workbench scope in this environment.",
                support: "If you should have access, ask BackendLead or PlatformLead to verify your active role grants."
              }
        );
        setBanner(null);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }

        setBlockingState(null);
        setBanner({ title: "Bootstrap fallback in use.", body: caughtError instanceof Error ? caughtError.message : "Bootstrap request failed." });
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => controller.abort();
  }, []);

  const currentRoute = routeLayouts[selectedRoute];
  const selectedRow = selectOrFallback(currentRoute.items, selectedIds[selectedRoute]);
  const selectedAlert = selectOrFallback(alerts, selectedAlertId);
  const alertCounts = getAlertCounts(alerts);
  const isShellEntryState = blockingState !== null && blockingState.kind !== "expired";
  const streamTone: Tone =
    blockingState?.kind === "expired"
      ? "warn"
      : blockingState
        ? "muted"
        : banner
          ? "warn"
          : loading
            ? "muted"
            : "good";

  return (
    <div className="workbench-app" aria-busy={loading}>
      <header className="shell-topbar">
        <div className="brand-cluster">
          <div className="brand-mark">P1</div>
          <div className="brand-copy">
            <p className="eyebrow">Desktop Analyst Desk</p>
            <h1>Paperclip Analyst Workbench</h1>
            <p className="lede">Five primary destinations, one shared alert operating surface, and server-owned permissions from bootstrap through action bars.</p>
          </div>
        </div>
        <div className="topbar-strip">
          <button className="chip-button" type="button">Cmd/Ctrl + K</button>
          {isShellEntryState ? (
            <section className="meta-chip">
              <span className={`status-pill is-${streamTone}`}>Blocked</span>
              <strong>Shell entry state</strong>
              <small>{blockingState.title}</small>
            </section>
          ) : (
            <>
              <button aria-expanded={expandedAlerts} className={expandedAlerts ? "chip-button is-accent" : "chip-button"} onClick={() => setExpandedAlerts((current) => !current)} type="button">
                Alerts
                <strong>{alertCounts.open}</strong>
                <span>{alertCounts.urgent} urgent</span>
              </button>
              <section className="meta-chip">
                <span className={`status-pill is-${streamTone}`}>{loading ? "Booting" : banner ? "Fallback mode" : blockingState ? "Blocked" : "Stream ready"}</span>
                <strong>{bootstrap.stream.authorized_channels.length} channels</strong>
                <small>{bootstrap.principal.actor.display_name}</small>
              </section>
              <section className="meta-chip">
                <span className="eyebrow">Session</span>
                <strong>{bootstrap.shell_defaults.active_session_date}</strong>
                <small>{bootstrap.principal.preferences.saved_view.replaceAll("_", " ")}</small>
              </section>
            </>
          )}
        </div>
      </header>
      {banner ? (
        <section className="global-banner is-warning" role="alert">
          <strong>{banner.title}</strong>
          <span>{banner.body}</span>
        </section>
      ) : null}
      {isShellEntryState ? (
        <section className="screen-stage">
          <div className="shell-entry">
            <p className="eyebrow">Shell state</p>
            <h3>{blockingState.title}</h3>
            <p>{blockingState.body}</p>
            {blockingState.support ? <p className="support-note">{blockingState.support}</p> : null}
            {blockingState.actionLabel ? <button className="action-button is-primary" onClick={() => window.location.reload()} type="button">{blockingState.actionLabel}</button> : null}
          </div>
        </section>
      ) : (
        <div className="shell-layout">
        <aside className="nav-rail">
          <div className="nav-header">
            <p className="eyebrow">Route rail</p>
            <strong>{workbenchRouteKeys.filter((routeKey) => bootstrap.route_scope.routes[routeKey]).length} routes visible</strong>
            <small>Scope stays server-owned from bootstrap.</small>
          </div>
          <nav aria-label="Workbench routes" className="nav-list">
            {workbenchRouteKeys.map((routeKey) => (
              <button aria-current={routeKey === selectedRoute ? "page" : undefined} className={routeKey === selectedRoute ? "nav-button is-active" : "nav-button"} disabled={!bootstrap.route_scope.routes[routeKey] || Boolean(blockingState)} key={routeKey} onClick={() => setSelectedRoute(routeKey)} type="button">
                <div>
                  <strong>{routeCopy[routeKey].label}</strong>
                  <small>{routeCopy[routeKey].summary}</small>
                </div>
                <span className={bootstrap.route_scope.routes[routeKey] ? "nav-state is-good" : "nav-state is-muted"}>{bootstrap.route_scope.routes[routeKey] ? "Open" : "Hidden"}</span>
              </button>
            ))}
          </nav>
        </aside>
        <section className="screen-stage">
          <header className="screen-header">
            <div>
              <p className="eyebrow">{routeCopy[selectedRoute].label}</p>
              <div className="screen-title-row">
                <h2>{routeCopy[selectedRoute].title}</h2>
                <span className="count-pill">{currentRoute.items.length} items</span>
              </div>
              <p className="screen-copy">{routeCopy[selectedRoute].summary}</p>
            </div>
            <div className="screen-actions">
              <div className="filter-row">
                <span className="filter-chip">{routeCopy[selectedRoute].filterSummary}</span>
                <span className="filter-chip">row anchor preserved</span>
                <span className="filter-chip">server-owned blockers</span>
              </div>
              <button className="action-button is-primary" disabled={Boolean(blockingState) || !bootstrap.route_scope.routes[selectedRoute]} type="button">
                {routeCopy[selectedRoute].primaryAction}
              </button>
            </div>
          </header>
          <>
            {currentRoute.summary ? (
              <div className="summary-band">
                {currentRoute.summary.map((card) => (
                  <article className="summary-card" key={card.label}>
                    <p className="eyebrow">{card.label}</p>
                    <strong>{card.value}</strong>
                    <small>{card.note}</small>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="surface-grid two-up">
              <section className="surface-card">
                <div className="section-top">
                  <div>
                    <p className="eyebrow">Primary surface</p>
                    <h3>{currentRoute.listLabel}</h3>
                  </div>
                  <span className={`status-pill is-${selectedRow.tone}`}>{selectedRow.kicker}</span>
                </div>
                <div className="row-list">
                  {currentRoute.items.map((item) => (
                    <button className={item.id === selectedRow.id ? "row-button is-active" : "row-button"} key={item.id} onClick={() => setSelectedIds((currentIds) => ({ ...currentIds, [selectedRoute]: item.id }))} type="button">
                      <div className="row-title-row">
                        <div>
                          <p className="row-kicker">{item.kicker}</p>
                          <strong>{item.title}</strong>
                        </div>
                        <span className={`status-pill is-${item.tone}`}>{item.note}</span>
                      </div>
                      <div className="row-meta">{item.meta.map((entry) => <span key={entry}>{entry}</span>)}</div>
                    </button>
                  ))}
                </div>
              </section>
              <aside className="surface-card is-detail">
                <div className="section-top">
                  <div>
                    <p className="eyebrow">Detail surface</p>
                    <h3>{currentRoute.detailLabel}</h3>
                  </div>
                  <span className="status-pill is-muted">{currentRoute.detail.status}</span>
                </div>
                <div className="banner-card is-muted">
                  <strong>{currentRoute.detail.bannerTitle}</strong>
                  <p>{currentRoute.detail.bannerBody}</p>
                </div>
                <dl className="detail-pairs">
                  {currentRoute.detail.pairs.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="action-row">
                  {currentRoute.detail.actions.map((action) => (
                    <button className={action.primary ? "action-button is-primary" : "action-button"} disabled={action.disabled} key={action.label} type="button">
                      {action.label}
                    </button>
                  ))}
                </div>
                {currentRoute.detail.inlineReason ? <p className="inline-reason">{currentRoute.detail.inlineReason}</p> : null}
                {currentRoute.detail.blocker ? (
                  <div className="banner-card is-warning">
                    <strong>More review steps required</strong>
                    <p>{currentRoute.detail.blocker}</p>
                  </div>
                ) : null}
              </aside>
            </div>
          </>
        </section>
        <aside className={expandedAlerts ? "alert-dock is-expanded" : "alert-dock"}>
          <div className="section-top">
            <div>
              <p className="eyebrow">Shared operating surface</p>
              <h3>Alert Inbox</h3>
            </div>
            <button className="chip-button" onClick={() => setExpandedAlerts((current) => !current)} type="button">{expandedAlerts ? "Collapse" : "Open inbox"}</button>
          </div>
          <div className="summary-band compact">
            <article className="summary-card"><p className="eyebrow">Open</p><strong>{alertCounts.open}</strong></article>
            <article className="summary-card"><p className="eyebrow">Urgent</p><strong>{alertCounts.urgent}</strong></article>
            <article className="summary-card"><p className="eyebrow">Freshness</p><strong>{alertCounts.degraded > 0 ? "Degraded" : "Healthy"}</strong></article>
          </div>
          <div className={expandedAlerts ? "alert-inbox-shell" : "mini-list"}>
            <section className="row-list">
              {alerts.map((alert) => (
                <button className={alert.id === selectedAlert.id ? "row-button is-active" : "row-button"} key={alert.id} onClick={() => setSelectedAlertId(alert.id)} type="button">
                  <div className="row-title-row">
                    <div>
                      <p className="row-kicker">{alert.family}</p>
                      <strong>{alert.symbol}</strong>
                    </div>
                    <span className={`status-pill is-${alert.status === "escalated" ? "warn" : "muted"}`}>{alert.status}</span>
                  </div>
                  <p>{alert.headline}</p>
                  <div className="row-meta"><span>{alert.owner}</span><span>{alert.dueAt ?? "No due timer"}</span></div>
                </button>
              ))}
            </section>
            {expandedAlerts ? (
              <aside className="surface-card is-detail">
                <div className="section-top">
                  <div>
                    <p className="eyebrow">Alert detail</p>
                    <h3>{selectedAlert.symbol}</h3>
                  </div>
                  <span className={`status-pill is-${selectedAlert.freshness === "healthy" ? "good" : "warn"}`}>{selectedAlert.freshness}</span>
                </div>
                <div className="banner-card is-muted">
                  <strong>Consensus state</strong>
                  <p>{selectedAlert.consensusState}</p>
                </div>
                <dl className="detail-pairs">
                  <div><dt>Workflow state</dt><dd>{selectedAlert.status}</dd></div>
                  <div><dt>Assigned owner</dt><dd>{selectedAlert.owner}</dd></div>
                  <div><dt>Review trigger</dt><dd>{selectedAlert.reviewTrigger}</dd></div>
                  <div><dt>Due timer</dt><dd>{selectedAlert.dueAt ?? "No due timer"}</dd></div>
                </dl>
                <div className="action-row">
                  <button className="action-button is-primary" type="button">{getPrimaryAlertAction(selectedAlert)}</button>
                  <button className="action-button" type="button">Assign owner</button>
                  <button className="action-button" type="button">Resolve</button>
                </div>
              </aside>
            ) : null}
          </div>
        </aside>
      </div>
      )}
      {blockingState?.kind === "expired" ? (
        <div aria-modal="true" className="overlay-state" role="alertdialog">
          <div className="overlay-panel">
            <p className="eyebrow">Session boundary</p>
            <h3>{blockingState.title}</h3>
            <p>{blockingState.body}</p>
            <button className="action-button is-primary" onClick={() => window.location.reload()} type="button">{blockingState.actionLabel}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
