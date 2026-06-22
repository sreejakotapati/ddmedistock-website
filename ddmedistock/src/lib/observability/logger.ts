// Structured logging (Pino).
//
// A single process-wide logger emitting JSON in production (ready for log
// shippers / Loki / CloudWatch) and pretty-ish output in development. Child
// loggers attach stable context (module, requestId, userId) so logs correlate
// across a request. Never log secrets or full request bodies.

import pino, { type Logger } from "pino";

const isProd = process.env.NODE_ENV === "production";

const globalForLogger = globalThis as unknown as { __logger?: Logger };

export const logger: Logger =
  globalForLogger.__logger ??
  pino({
    level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
    // Redact common sensitive paths defensively.
    redact: {
      paths: [
        "password", "passwordHash", "token", "authorization",
        "*.password", "*.passwordHash", "*.token", "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[redacted]",
    },
    base: { service: "ddmedistock" },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

if (!isProd) globalForLogger.__logger = logger;

/** Child logger bound to a module/component name. */
export function moduleLogger(module: string): Logger {
  return logger.child({ module });
}

/** Generate a short correlation id for a request. */
export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
