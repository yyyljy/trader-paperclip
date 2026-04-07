import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { parseApiEnv } from "@trader-paperclip/config";
import { resolveWorkspaceRoot } from "@trader-paperclip/foundation";

function redactConnectionString(connectionString: string) {
  try {
    const parsed = new URL(connectionString);

    if (parsed.password) {
      parsed.password = "***";
    }

    return parsed.toString();
  } catch {
    return "<invalid-database-url>";
  }
}

const config = parseApiEnv(process.env);
const workspaceRoot = resolveWorkspaceRoot();
const migrationsDirectory = join(workspaceRoot, "migrations");
const migrations = (await readdir(migrationsDirectory))
  .filter((entry) => entry.endsWith(".sql"))
  .sort();

console.log(`Migration target: ${redactConnectionString(config.DATABASE_URL)}`);

if (migrations.length === 0) {
  console.log("No migrations found.");
  process.exit(0);
}

for (const migration of migrations) {
  console.log(`- ${migration}`);
}

console.log(`Validated ${migrations.length} migration file(s).`);
