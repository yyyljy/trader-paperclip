import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const migrationsDir = path.resolve(import.meta.dirname, "..", "migrations");
const command = process.argv[2];

const run = async () => {
  const files = (await readdir(migrationsDir))
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  if (files.length === 0) {
    throw new Error("No SQL migrations were found.");
  }

  if (command === "check") {
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const contents = await readFile(fullPath, "utf8");

      if (!contents.includes("CREATE TABLE")) {
        throw new Error(`Migration ${file} does not contain a CREATE TABLE statement.`);
      }
    }

    console.log(`Migration check passed for ${files.length} file(s).`);
    return;
  }

  if (command === "migrate") {
    if (!process.env.DATABASE_URL) {
      console.log("DATABASE_URL not set. Skipping migration apply in synthetic mode.");
      return;
    }

    console.log(`DATABASE_URL detected. Apply the following SQL files in order: ${files.join(", ")}`);
    console.log("This bootstrap keeps migration execution explicit until the persistent backend slice lands.");
    return;
  }

  throw new Error(`Unsupported db command: ${command}`);
};

void run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
