// Sentry error tracking — lazy, optional, dependency-light.
//
// We avoid a hard dependency on @sentry/nextjs (and the build-time wrapping it
// needs) so the app builds and runs without it. When SENTRY_DSN is set AND the
// SDK is installed, captureException forwards errors; otherwise it falls back
// to structured logging. To enable fully: `npm i @sentry/node` and set
// SENTRY_DSN (and optionally SENTRY_TRACES_SAMPLE_RATE).

import { moduleLogger } from "./logger";

const log = moduleLogger("sentry");

export function isSentryEnabled(): boolean {
  return !!process.env.SENTRY_DSN;
}

type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (e: unknown, ctx?: Record<string, unknown>) => void;
  flush?: (timeout?: number) => Promise<boolean>;
};

let sentry: SentryLike | null = null;
let initTried = false;

async function getSentry(): Promise<SentryLike | null> {
  if (initTried) return sentry;
  initTried = true;
  if (!isSentryEnabled()) return null;
  try {
    // Optional dependency — resolved at runtime only when configured.
    const mod = (await import(/* webpackIgnore: true */ "@sentry/node" as string)) as unknown as SentryLike;
    mod.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    });
    sentry = mod;
    log.info("sentry.initialized");
  } catch {
    log.warn("sentry.dsn_set_but_sdk_missing — install @sentry/node to enable");
    sentry = null;
  }
  return sentry;
}

/** Report an error to Sentry if configured, always also logging it. */
export async function captureException(err: unknown, context: Record<string, unknown> = {}): Promise<void> {
  log.error({ err: (err as Error)?.message, ...context }, "exception");
  const s = await getSentry();
  s?.captureException(err, { extra: context });
}
