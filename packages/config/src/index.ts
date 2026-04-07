import { applicationEnvironments } from "@trader-paperclip/contracts";
import { z } from "zod";

const runtimeSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(applicationEnvironments).default("local"),
  APP_VERSION: z.string().default("0.1.0"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive(),
  HEALTHCHECK_PATH: z.string().default("/healthz"),
  READINESS_PATH: z.string().default("/readyz"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default("http://localhost:4318")
});

const apiSchema = runtimeSchema.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/trader_paperclip"),
  QUEUE_DATABASE_URL: z.string().optional(),
  OBJECT_STORAGE_BUCKET: z.string().default("trader-paperclip-local"),
  OBJECT_STORAGE_REGION: z.string().default("local"),
  AUTH_ISSUER: z.string().url().default("http://localhost:4000/auth/mock"),
  AUTH_AUDIENCE: z.string().default("trader-paperclip-workbench"),
  API_PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),
  SSE_PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000")
});

const workerSchema = runtimeSchema.extend({
  PORT: z.coerce.number().int().positive().default(4100),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/trader_paperclip"),
  QUEUE_DATABASE_URL: z.string().optional()
});

const schedulerSchema = runtimeSchema.extend({
  PORT: z.coerce.number().int().positive().default(4200),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/trader_paperclip"),
  QUEUE_DATABASE_URL: z.string().optional()
});

const webSchema = z.object({
  MODE: z.enum(["development", "production", "test"]).default("development"),
  VITE_APP_ENV: z.enum(applicationEnvironments).default("local"),
  VITE_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  VITE_SSE_BASE_URL: z.string().url().default("http://localhost:4000"),
  VITE_APP_VERSION: z.string().default("0.1.0")
});

export type ApiConfig = ReturnType<typeof parseApiEnv>;
export type WorkerConfig = ReturnType<typeof parseWorkerEnv>;
export type SchedulerConfig = ReturnType<typeof parseSchedulerEnv>;
export type WebConfig = ReturnType<typeof parseWebEnv>;

export function parseApiEnv(source: Record<string, string | undefined>) {
  const parsed = apiSchema.parse(source);

  return {
    ...parsed,
    QUEUE_DATABASE_URL: parsed.QUEUE_DATABASE_URL ?? parsed.DATABASE_URL
  };
}

export function parseWorkerEnv(source: Record<string, string | undefined>) {
  const parsed = workerSchema.parse(source);

  return {
    ...parsed,
    QUEUE_DATABASE_URL: parsed.QUEUE_DATABASE_URL ?? parsed.DATABASE_URL
  };
}

export function parseSchedulerEnv(source: Record<string, string | undefined>) {
  const parsed = schedulerSchema.parse(source);

  return {
    ...parsed,
    QUEUE_DATABASE_URL: parsed.QUEUE_DATABASE_URL ?? parsed.DATABASE_URL
  };
}

export function parseWebEnv(source: Record<string, string | boolean | undefined>) {
  return webSchema.parse(source);
}

export function loadApiConfig(source: Record<string, string | undefined> = process.env) {
  const parsed = parseApiEnv(source);

  return {
    appEnv: parsed.APP_ENV,
    logLevel: parsed.LOG_LEVEL,
    syntheticMode: parsed.APP_ENV === "local",
    host: parsed.HOST,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    publicApiBaseUrl: parsed.API_PUBLIC_BASE_URL,
    webOrigin: parsed.API_PUBLIC_BASE_URL,
    sseHeartbeatIntervalSec: 15,
    sseRetryMs: 2000
  };
}

export function loadWorkerConfig(source: Record<string, string | undefined> = process.env) {
  const parsed = parseWorkerEnv(source);

  return {
    appEnv: parsed.APP_ENV,
    logLevel: parsed.LOG_LEVEL,
    syntheticMode: parsed.APP_ENV === "local",
    host: parsed.HOST,
    port: parsed.PORT,
    pollIntervalMs: 5000
  };
}

export function loadSchedulerConfig(source: Record<string, string | undefined> = process.env) {
  const parsed = parseSchedulerEnv(source);

  return {
    appEnv: parsed.APP_ENV,
    logLevel: parsed.LOG_LEVEL,
    syntheticMode: parsed.APP_ENV === "local",
    host: parsed.HOST,
    port: parsed.PORT,
    tickIntervalMs: 15000
  };
}

export function loadWebConfig(source: Record<string, string | boolean | undefined>) {
  const parsed = parseWebEnv(source);

  return {
    appEnv: parsed.VITE_APP_ENV,
    apiBaseUrl: parsed.VITE_API_BASE_URL
  };
}
