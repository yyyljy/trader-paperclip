import { parseApiEnv } from "@trader-paperclip/config";
import { loadFixtureDataset } from "@trader-paperclip/foundation";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApiApp } from "../src/app.js";

const config = parseApiEnv({
  APP_ENV: "local",
  API_PUBLIC_BASE_URL: "http://localhost:4000",
  AUTH_ISSUER: "http://localhost:4000/auth/mock",
  PORT: "4000",
  SSE_PUBLIC_BASE_URL: "http://localhost:4000"
});

const dataset = loadFixtureDataset(process.cwd());

let app: Awaited<ReturnType<typeof buildApiApp>>;

describe("api foundation routes", () => {
  beforeAll(async () => {
    app = await buildApiApp(config, dataset);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the fixture-backed bootstrap payload", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/workbench/bootstrap?session_id=session-analysis-lead"
    });

    expect(response.statusCode).toBe(200);

    const payload = response.json();

    expect(payload.principal.actor.display_name).toBe("AnalysisLead");
    expect(payload.route_scope.routes.triage).toBe(true);
    expect(payload.stream.authorized_channels).toContain("desk:cross_desk");
  });

  it("replays SSE events for authorized channels", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/events/stream?session_id=session-analysis-lead&channels=desk:TMT&last_event_id=1001"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("event: lock.changed");
    expect(response.body).toContain("event: stale_state.updated");
  });
});
