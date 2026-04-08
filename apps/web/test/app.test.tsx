import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BootstrapResponse } from "@trader-paperclip/contracts";

import App from "../src/App";

const bootstrap: BootstrapResponse = {
  principal: {
    session_id: "session-analysis-lead",
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
    url: "http://localhost:4000/v1/events/stream?channels=me,desk:cross_desk",
    heartbeat_interval_sec: 15,
    retry_ms: 2000,
    authorized_channels: ["me", "desk:cross_desk"]
  },
  freshness: {
    as_of_timestamp: "2026-04-08T12:00:00Z",
    session_date: "2026-04-08"
  }
};

function makeBootstrap(overrides?: Partial<BootstrapResponse>): BootstrapResponse {
  return {
    ...bootstrap,
    ...overrides,
    principal: {
      ...bootstrap.principal,
      ...(overrides?.principal ?? {}),
      preferences: {
        ...bootstrap.principal.preferences,
        ...(overrides?.principal?.preferences ?? {})
      }
    },
    route_scope: {
      ...bootstrap.route_scope,
      ...(overrides?.route_scope ?? {}),
      routes: {
        ...bootstrap.route_scope.routes,
        ...(overrides?.route_scope?.routes ?? {})
      }
    },
    shell_defaults: {
      ...bootstrap.shell_defaults,
      ...(overrides?.shell_defaults ?? {})
    },
    stream: {
      ...bootstrap.stream,
      ...(overrides?.stream ?? {})
    },
    freshness: {
      ...bootstrap.freshness,
      ...(overrides?.freshness ?? {})
    }
  };
}

describe("web shell", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the workbench shell from bootstrap", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(bootstrap), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Paperclip Analyst Workbench" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Source Triage Board" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /alerts/i })).toBeInTheDocument();
  });

  it("renders sign-in required for authentication failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "authentication_required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /alerts/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Source Triage Board" })).not.toBeInTheDocument();
  });

  it("falls back to synthetic bootstrap on non-shell errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Paperclip Analyst Workbench" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Bootstrap fallback in use.");
  });

  it("renders access denied support copy when workbench scope is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "workbench_scope_missing" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Workbench access not granted" })).toBeInTheDocument();
    expect(
      screen.getByText(/ask BackendLead or PlatformLead to verify your active role grants/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /alerts/i })).not.toBeInTheDocument();
  });

  it("uses the server default route on the first successful bootstrap hydrate", async () => {
    const reviewBootstrap = makeBootstrap({
      principal: {
        ...bootstrap.principal,
        preferences: {
          ...bootstrap.principal.preferences,
          default_route: "review"
        }
      },
      shell_defaults: {
        ...bootstrap.shell_defaults,
        default_route: "review"
      }
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(reviewBootstrap), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Review Queue" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Source Triage Board" })).not.toBeInTheDocument();
  });
});
