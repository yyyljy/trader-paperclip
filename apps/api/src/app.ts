import cors from "@fastify/cors";
import { type ApiConfig } from "@trader-paperclip/config";
import {
  FoundationError,
  buildBootstrapResponse,
  formatHeartbeatFrame,
  formatRetryFrame,
  formatSseFrame,
  loadFixtureDataset,
  parseRequestedChannels,
  resolveHumanSession,
  resolveReplayEvents,
  resolveWorkspaceRoot,
  summarizeFoundation,
  type FixtureDataset
} from "@trader-paperclip/foundation";
import Fastify, { type FastifyInstance } from "fastify";

function sessionIdFromQuery(value: string | undefined) {
  return value ?? "session-analysis-lead";
}

function replayCursor(queryValue: string | undefined, headerValue: string | string[] | undefined) {
  const rawHeaderValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const rawValue = queryValue ?? rawHeaderValue;

  if (!rawValue) return undefined;

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function buildApiApp(
  config: ApiConfig,
  dataset: FixtureDataset = loadFixtureDataset(resolveWorkspaceRoot())
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL
    }
  });

  await app.register(cors, { origin: true });

  app.get(config.HEALTHCHECK_PATH, async () => ({
    status: "ok",
    role: "api",
    version: config.APP_VERSION
  }));

  app.get(config.READINESS_PATH, async () => ({
    status: "ready",
    role: "api",
    dataset_summary: summarizeFoundation(dataset),
    database_url_configured: Boolean(config.DATABASE_URL),
    queue_database_configured: Boolean(config.QUEUE_DATABASE_URL)
  }));

  app.get<{
    Querystring: {
      session_id?: string;
    };
  }>("/v1/workbench/bootstrap", async (request, reply) => {
    try {
      return buildBootstrapResponse(dataset, sessionIdFromQuery(request.query.session_id));
    } catch (error) {
      if (error instanceof FoundationError) {
        return reply.code(error.status).send(error.body);
      }

      throw error;
    }
  });

  app.get<{
    Querystring: {
      session_id?: string;
      channels?: string;
      last_event_id?: string;
    };
  }>("/v1/events/stream", async (request, reply) => {
    try {
      const sessionId = sessionIdFromQuery(request.query.session_id);
      const principal = resolveHumanSession(dataset, sessionId);
      const requestedChannels = parseRequestedChannels(request.query.channels);
      const lastSequence = replayCursor(request.query.last_event_id, request.headers["last-event-id"]);
      const replayEvents = resolveReplayEvents(dataset, principal, requestedChannels, lastSequence);

      reply
        .header("content-type", "text/event-stream")
        .header("cache-control", "no-cache")
        .header("connection", "keep-alive");

      reply.raw.write(formatRetryFrame(dataset.metadata.retry_ms));

      for (const event of replayEvents) {
        reply.raw.write(formatSseFrame(event));
      }

      reply.raw.write(formatHeartbeatFrame(dataset.metadata.as_of_timestamp));
      reply.raw.end();

      return reply;
    } catch (error) {
      if (error instanceof FoundationError) {
        return reply.code(error.status).send(error.body);
      }

      throw error;
    }
  });

  return app;
}
