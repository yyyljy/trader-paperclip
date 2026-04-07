import { describe, expect, it } from "vitest";

import { loadFixtureDataset } from "./fixtures.js";
import { FoundationError, buildBootstrapResponse, ensureRequestedChannels, resolveHumanSession } from "./foundation.js";
import { resolveReplayEvents } from "./sse.js";

describe("workbench foundation", () => {
  const dataset = loadFixtureDataset(process.cwd());

  it("builds bootstrap state for the analysis lead", () => {
    const bootstrap = buildBootstrapResponse(dataset, "session-analysis-lead", new Date("2026-04-08T12:00:00Z"));

    expect(bootstrap.principal.actor.display_name).toBe("AnalysisLead");
    expect(bootstrap.route_scope.routes.triage).toBe(true);
    expect(bootstrap.stream.authorized_channels).toContain("desk:cross_desk");
    expect(bootstrap.stream.authorized_channels).toContain("coverage_entity:coverage-nvda");
    expect(bootstrap.approval_policy_rows.map((row) => row.policy_key)).toContain("tmt_default");
  });

  it("rejects machine principals on human-only routes", () => {
    expect(() => resolveHumanSession(dataset, "session-machine-worker", new Date("2026-04-08T12:00:00Z"))).toThrowError(
      FoundationError,
    );

    try {
      resolveHumanSession(dataset, "session-machine-worker", new Date("2026-04-08T12:00:00Z"));
    } catch (error) {
      expect(error).toBeInstanceOf(FoundationError);
      const foundationError = error as FoundationError;
      expect(foundationError.status).toBe(403);
      expect(foundationError.body.error).toBe("human_session_required");
    }
  });

  it("blocks unauthorized channel requests", () => {
    const principal = resolveHumanSession(dataset, "session-tmt-analyst", new Date("2026-04-08T12:00:00Z"));

    expect(() => ensureRequestedChannels(dataset, principal, ["desk:cross_desk"])).toThrowError(FoundationError);
  });

  it("surfaces replay gaps and returns replayable events", () => {
    const principal = resolveHumanSession(dataset, "session-analysis-lead", new Date("2026-04-08T12:00:00Z"));

    expect(() => resolveReplayEvents(dataset, principal, ["desk:TMT"], 999)).toThrowError(FoundationError);

    const events = resolveReplayEvents(dataset, principal, ["desk:TMT"], 1001);
    expect(events.map((event) => event.sequence)).toEqual([1002, 1003]);
  });
});
