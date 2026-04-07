import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ActorRef,
  ApprovalPolicyRow,
  AuditEvent,
  EventOutboxRow,
  LockRecord,
  PrincipalSession,
  RoleAssignment,
  StaleStateRecord,
  WorkbenchFeatureFlags,
} from "@trader-paperclip/contracts";

export interface RoleGrant extends RoleAssignment {
  grant_id: string;
  actor_id: string;
  actor_type: "human" | "machine";
  scope_kind: "global" | "desk" | "coverage_entity";
  grant_source: string;
  starts_at: string | null;
  ends_at: string | null;
  status: "active" | "disabled" | "expired";
  created_by: string;
  updated_by: string;
}

export interface CoverageEntityRecord {
  coverage_entity_id: string;
  desk: string;
  subsector: string;
  coverage_tier: string;
  primary_owner: ActorRef;
  backup_reviewer: ActorRef;
}

export interface EntityScopeRecord {
  entity_type: string;
  entity_id: string;
  coverage_entity_id: string | null;
  desk: string | null;
}

export interface FixtureDataset {
  metadata: {
    as_of_timestamp: string;
    session_date: string;
    timezone: string;
    heartbeat_interval_sec: number;
    retry_ms: number;
  };
  feature_flags: WorkbenchFeatureFlags;
  sessions: PrincipalSession[];
  role_grants: RoleGrant[];
  coverage_entities: CoverageEntityRecord[];
  approval_policy_rows: ApprovalPolicyRow[];
  entity_scope_index: EntityScopeRecord[];
  outbox_events: EventOutboxRow[];
  audit_events: AuditEvent[];
  locks: LockRecord[];
  stale_states: StaleStateRecord[];
}

function packageDir() {
  return dirname(fileURLToPath(import.meta.url));
}

function findWorkspaceRoot(startDir: string) {
  let current = startDir;

  while (true) {
    const packageJsonPath = join(current, "package.json");
    if (existsSync(packageJsonPath)) {
      const raw = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { workspaces?: string[] };
      if (Array.isArray(raw.workspaces)) {
        return current;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`Unable to locate trader-paperclip workspace root from ${startDir}`);
    }
    current = parent;
  }
}

export function resolveWorkspaceRoot(override?: string) {
  if (override) return override;
  if (process.env.TRADER_PAPERCLIP_ROOT) return process.env.TRADER_PAPERCLIP_ROOT;
  if (process.env.INIT_CWD) return process.env.INIT_CWD;
  return findWorkspaceRoot(packageDir());
}

export function loadFixtureDataset(rootDir?: string): FixtureDataset {
  const fixturePath = join(resolveWorkspaceRoot(rootDir), "fixtures", "local", "workbench-foundation.json");
  const raw = readFileSync(fixturePath, "utf8");
  return JSON.parse(raw) as FixtureDataset;
}

