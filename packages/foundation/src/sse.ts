import type { EventEnvelope, EventOutboxRow, PrincipalSession } from "@trader-paperclip/contracts";

import type { FixtureDataset } from "./fixtures.js";
import { FoundationError, ensureRequestedChannels } from "./foundation.js";

function intersects(left: string[], right: string[]) {
  return left.some((value) => right.includes(value));
}

export function parseRequestedChannels(rawChannels: string | undefined) {
  if (!rawChannels) return ["me"];
  return rawChannels
    .split(",")
    .map((channel) => channel.trim())
    .filter(Boolean);
}

export function buildEventEnvelope(event: EventOutboxRow): EventEnvelope {
  return {
    id: event.event_id,
    sequence: event.sequence,
    event_type: event.event_type,
    channel_keys: event.channel_keys,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    entity_version: event.entity_version,
    workflow_id: event.workflow_id,
    correlation_id: event.correlation_id,
    actor: {
      actor_id: event.actor_id,
      actor_type: event.actor_type,
    },
    occurred_at: event.occurred_at,
    committed_at: event.committed_at,
    payload: event.payload_json,
  };
}

export function resolveReplayEvents(
  dataset: FixtureDataset,
  principal: PrincipalSession,
  requestedChannels: string[],
  lastSequence?: number,
) {
  ensureRequestedChannels(dataset, principal, requestedChannels);

  const oldestSequence = dataset.outbox_events.reduce((oldest, event) => Math.min(oldest, event.sequence), Infinity);
  if (Number.isFinite(oldestSequence) && typeof lastSequence === "number" && lastSequence < oldestSequence) {
    throw new FoundationError(409, {
      error: "event_replay_gap",
      requested_sequence: lastSequence,
      oldest_available_sequence: oldestSequence,
      restart_hint: "reload_bootstrap_and_active_views",
    });
  }

  return dataset.outbox_events
    .filter((event) => (typeof lastSequence === "number" ? event.sequence > lastSequence : true))
    .filter((event) => intersects(event.channel_keys, requestedChannels))
    .map(buildEventEnvelope);
}

export function formatSseFrame(event: EventEnvelope) {
  return `id: ${event.sequence}\nevent: ${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function formatRetryFrame(retryMs: number) {
  return `retry: ${retryMs}\n\n`;
}

export function formatHeartbeatFrame(timestamp = new Date().toISOString()) {
  return `: keepalive ${timestamp}\n\n`;
}

