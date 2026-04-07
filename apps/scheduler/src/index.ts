import { createServer } from "node:http";

import { parseSchedulerEnv } from "@trader-paperclip/config";
import { loadFixtureDataset, resolveWorkspaceRoot, summarizeFoundation } from "@trader-paperclip/foundation";

const config = parseSchedulerEnv(process.env);
const dataset = loadFixtureDataset(resolveWorkspaceRoot());
const summary = summarizeFoundation(dataset);
const startedAt = new Date().toISOString();

const server = createServer((request, response) => {
  if (request.url === config.HEALTHCHECK_PATH || request.url === config.READINESS_PATH) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        status: "ready",
        role: "scheduler",
        version: config.APP_VERSION,
        appEnv: config.APP_ENV,
        startedAt,
        summary
      })
    );
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ status: "not_found" }));
});

server.listen(config.PORT, config.HOST, () => {
  console.log(
    JSON.stringify({
      message: "scheduler ready",
      appEnv: config.APP_ENV,
      port: config.PORT,
      summary
    })
  );
});

const heartbeat = setInterval(() => {
  console.log(
    JSON.stringify({
      message: "scheduler heartbeat",
      appEnv: config.APP_ENV,
      timestamp: new Date().toISOString()
    })
  );
}, 45_000);

const shutdown = (signal: string) => {
  clearInterval(heartbeat);
  server.close(() => {
    console.log(JSON.stringify({ message: "scheduler stopped", signal }));
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
