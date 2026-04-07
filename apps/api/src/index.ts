import { parseApiEnv } from "@trader-paperclip/config";
import { loadFixtureDataset, resolveWorkspaceRoot } from "@trader-paperclip/foundation";

import { buildApiApp } from "./app.js";

const config = parseApiEnv(process.env);
const dataset = loadFixtureDataset(resolveWorkspaceRoot());
const app = await buildApiApp(config, dataset);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down api");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await app.listen({
  host: config.HOST,
  port: config.PORT
});

app.log.info(
  {
    appEnv: config.APP_ENV,
    apiBaseUrl: config.API_PUBLIC_BASE_URL
  },
  "api ready"
);
