import { parseWebEnv } from "@trader-paperclip/config";
import { type BootstrapResponse, type WorkbenchRouteKey } from "@trader-paperclip/contracts";

const env = parseWebEnv(import.meta.env as Record<string, string | boolean | undefined>);

export type Tone = "good" | "warn" | "muted";
export type NonEmptyArray<T> = readonly [T, ...T[]];

export interface SurfaceRow {
  id: string;
  kicker: string;
  title: string;
  meta: string[];
  tone: Tone;
  note: string;
}

export interface RouteLayout {
  listLabel: string;
  detailLabel: string;
  summary?: Array<{ label: string; value: string; note: string }>;
  items: NonEmptyArray<SurfaceRow>;
  detail: {
    status: string;
    pairs: Array<[label: string, value: string]>;
    bannerTitle: string;
    bannerBody: string;
    actions: Array<{ label: string; primary?: boolean; disabled?: boolean }>;
    inlineReason?: string;
    blocker?: string;
  };
}

export interface AlertRecord {
  id: string;
  family: string;
  symbol: string;
  headline: string;
  status: "new" | "acknowledged" | "linked" | "escalated";
  owner: string;
  dueAt: string | null;
  freshness: "healthy" | "degraded" | "stale";
  requiresIntradayUpdate: boolean;
  reviewTrigger: string;
  consensusState: string;
}

export const routeCopy: Record<
  WorkbenchRouteKey,
  { label: string; title: string; summary: string; filterSummary: string; primaryAction: string }
> = {
  triage: {
    label: "Triage",
    title: "Source Triage Board",
    summary: "Route incoming sources into attributable work without losing urgency or provenance.",
    filterSummary: "pre_market / urgent / routed",
    primaryAction: "Create evidence item"
  },
  drafts: {
    label: "Drafts",
    title: "Evidence And Draft Workspace",
    summary: "Keep facts, inference, lock state, and review posture visible together.",
    filterSummary: "desk_note / lock-aware / support",
    primaryAction: "Save revision"
  },
  review: {
    label: "Review",
    title: "Review Queue",
    summary: "Surface blockers, approver identity, and revision context beside the active subject.",
    filterSummary: "due soon / required approver",
    primaryAction: "Approve"
  },
  session_board: {
    label: "Session Board",
    title: "Morning Watchlist And Session Board",
    summary: "Synthesize ranked watchlist changes and alert obligations in one operating surface.",
    filterSummary: "cross_desk / intraday / alert-linked",
    primaryAction: "Open related draft"
  },
  packet_desk: {
    label: "Packet Desk",
    title: "Recommendation Packet Desk",
    summary: "Keep packet assembly, publish blockers, and history in one scoped rail.",
    filterSummary: "eligible / blocked / publish-ready",
    primaryAction: "Publish packet"
  }
};

export const routeLayouts: Record<WorkbenchRouteKey, RouteLayout> = {
  triage: {
    listLabel: "Urgency-ranked source queue",
    detailLabel: "Selected source",
    items: [
      {
        id: "triage-nvda",
        kicker: "earnings_call",
        title: "NVDA supplier checks imply second-wave networking pressure",
        meta: ["NVDA / ANET", "TMTLead", "Apr 8, 9:15 AM"],
        tone: "warn",
        note: "Needs attributable follow-up"
      }
    ],
    detail: {
      status: "Routeable",
      pairs: [
        ["Owner", "TMTLead"],
        ["Deadline", "Apr 8, 9:15 AM"],
        ["Downstream state", "Needs attributable follow-up"],
        ["Anchor rule", "Keep row selection stable across SSE refresh."]
      ],
      bannerTitle: "Provenance-first routing",
      bannerBody: "The shell keeps stale-source warnings, downstream links, and explicit next-owner deadlines visible.",
      actions: [{ label: "Create evidence item", primary: true }, { label: "Open or create draft" }]
    }
  },
  drafts: {
    listLabel: "Linked evidence and drafts",
    detailLabel: "Editor + support rail",
    items: [
      {
        id: "draft-note",
        kicker: "desk_note",
        title: "Semis desk note: networking digestion versus AI durability",
        meta: ["4 sources", "6 evidence items", "draft"],
        tone: "muted",
        note: "Facts and inference stay visibly separate."
      }
    ],
    detail: {
      status: "Lock required",
      pairs: [
        ["Reviewer", "SectorLead"],
        ["Required approver", "AnalysisLead"],
        ["Watchlist context", "Linked to Session Board item"],
        ["Freshness", "Apr 8, 8:50 AM"]
      ],
      bannerTitle: "Lock context",
      bannerBody: "No editing surface becomes writable until a valid content lock is held by the current actor.",
      actions: [{ label: "Save revision", disabled: true }, { label: "Submit for review", primary: true, disabled: true }],
      inlineReason: "Acquire the content lock before save. Review actions remain separate from edit ownership."
    }
  },
  review: {
    listLabel: "Due-time ordered review work",
    detailLabel: "Review pane",
    items: [
      {
        id: "review-avgo",
        kicker: "desk_note",
        title: "AVGO / ANET review packet",
        meta: ["Apr 8, 9:00 AM", "AnalysisLead", "delta +0.4"],
        tone: "warn",
        note: "ResearchLead required for final publish authority."
      }
    ],
    detail: {
      status: "ResearchLead",
      pairs: [
        ["Review posture", "Read-only in this scope"],
        ["Required approver", "ResearchLead"],
        ["Diff navigation", "Anchored beside active subject"],
        ["Parallel review", "Visible near action bar"]
      ],
      bannerTitle: "Read-only in this scope",
      bannerBody: "You can view this item, but one or more actions are unavailable in your current role or policy state.",
      actions: [{ label: "Request changes" }, { label: "Approve", primary: true }, { label: "Publish", disabled: true }],
      inlineReason: "Only ResearchLead can complete this step right now.",
      blocker: "Parallel macro review still required."
    }
  },
  session_board: {
    listLabel: "Ranked watchlist",
    detailLabel: "Timeline + detail",
    summary: [
      { label: "Macro regime", value: "Risk-on, event-sensitive", note: "Cross-asset shock still routes into same-session review targets." },
      { label: "Alert summary", value: "2 open urgent obligations", note: "Use the shared Alert Inbox, not a sixth screen." }
    ],
    items: [
      {
        id: "board-nvda",
        kicker: "Long bias",
        title: "NVDA",
        meta: ["4.2 / High", "Rubin timing still on track", "AnalysisLead"],
        tone: "good",
        note: "Networking digestion still unresolved."
      }
    ],
    detail: {
      status: "Alert-linked",
      pairs: [
        ["Primary support", "Rubin timing still on track"],
        ["Key risk", "Networking digestion still unresolved"],
        ["Next owner", "AnalysisLead"],
        ["Timeline", "Anchor both watchlist row and alert context"]
      ],
      bannerTitle: "Same-session timeline",
      bannerBody: "The shell reserves a timeline slot for alert acknowledgement, review-state changes, and macro shifts.",
      actions: [{ label: "Open related draft", primary: true }, { label: "Mark for same-session review" }]
    }
  },
  packet_desk: {
    listLabel: "Packet-eligible names",
    detailLabel: "Publish gate rail",
    items: [
      {
        id: "packet-nvda",
        kicker: "Long",
        title: "NVDA",
        meta: ["4.2 confidence", "4 support refs", "Blocked"],
        tone: "warn",
        note: "ResearchLead signoff still pending."
      }
    ],
    detail: {
      status: "Server-owned",
      pairs: [
        ["Assembly", "Keep packet ordering and entry rails visible"],
        ["Publish posture", "Read-only in this scope"],
        ["History", "Withdraw and supersede stay in the same rail"],
        ["Blocked reason", "Required approver lives beside publish"]
      ],
      bannerTitle: "Read-only in this scope",
      bannerBody: "You can view this item, but one or more actions are unavailable in your current role or policy state.",
      actions: [{ label: "Add to packet" }, { label: "Publish packet", primary: true, disabled: true }],
      inlineReason: "Only ResearchLead can complete this step right now.",
      blocker: "More review steps required before publish."
    }
  }
};

export const alerts: NonEmptyArray<AlertRecord> = [
  {
    id: "alert-nvda",
    family: "Intraday surprise",
    symbol: "NVDA",
    headline: "Consensus drift widened enough to require an intraday update path.",
    status: "escalated",
    owner: "AnalysisLead",
    dueAt: "Apr 8, 9:20 AM",
    freshness: "healthy",
    requiresIntradayUpdate: true,
    reviewTrigger: "confidence delta and vendor gap",
    consensusState: "Consensus unavailable: server forces manual fallback copy."
  },
  {
    id: "alert-anet",
    family: "Review trigger",
    symbol: "ANET",
    headline: "Alert-linked recommendation moved into review after policy threshold.",
    status: "linked",
    owner: "SectorLead",
    dueAt: null,
    freshness: "degraded",
    requiresIntradayUpdate: false,
    reviewTrigger: "required approver mismatch",
    consensusState: "Consensus context live for EPS and revenue only."
  },
  {
    id: "alert-asml",
    family: "Watch",
    symbol: "ASML",
    headline: "Equipment order commentary added to same-session summary but not yet escalated.",
    status: "acknowledged",
    owner: "MacroLead",
    dueAt: "Apr 8, 11:00 AM",
    freshness: "stale",
    requiresIntradayUpdate: false,
    reviewTrigger: "none",
    consensusState: "Consensus unavailable: manual fallback remains explicit."
  }
];

export const fallbackBootstrap: BootstrapResponse = {
  principal: {
    session_id: "fallback-session",
    actor: { actor_id: "actor-analysis-lead", actor_type: "human", display_name: "AnalysisLead", role_key: "analysis_lead" },
    auth_context: {
      provider: "local_stub",
      subject: "analysis.lead",
      assurance_level: "dev_stub",
      environment: "local",
      issued_at: "2026-04-08T11:00:00Z",
      expires_at: "2026-04-08T20:00:00Z"
    },
    role_assignments: [{ role_key: "analysis_lead", scope_kind: "desk", desk: "cross_desk", coverage_entity_id: null, is_primary: true }],
    preferences: { selected_desk: "cross_desk", saved_view: "pre_market", default_route: "triage" }
  },
  route_scope: { can_access_workbench: true, routes: { triage: true, drafts: true, review: true, session_board: true, packet_desk: true } },
  role_assignments: [{ role_key: "analysis_lead", scope_kind: "desk", desk: "cross_desk", coverage_entity_id: null, is_primary: true }],
  coverage_scopes: [],
  approval_policy_rows: [],
  feature_flags: { triage_board: true, draft_workspace: true, review_queue: true, session_board: true, packet_desk: true, diff_modal: true, sse_replay: true },
  shell_defaults: { default_route: "triage", saved_view: "pre_market", active_session_date: "2026-04-08", timezone: "America/New_York" },
  stream: {
    url: `${env.VITE_SSE_BASE_URL}/v1/events/stream?channels=me,desk:cross_desk`,
    heartbeat_interval_sec: 15,
    retry_ms: 2000,
    authorized_channels: ["me", "desk:cross_desk"]
  },
  freshness: { as_of_timestamp: "2026-04-08T12:00:00Z", session_date: "2026-04-08" }
};
