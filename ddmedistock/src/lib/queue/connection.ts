// Redis connection options for BullMQ.
//
// Queues are OPTIONAL: when REDIS_URL is unset the app keeps working by running
// jobs inline (see producer.ts). We hand BullMQ a parsed options object rather
// than a pre-built client, so BullMQ creates and owns the connection with its
// own bundled ioredis — avoiding dual-ioredis type clashes and lifecycle bugs.

import { type ConnectionOptions } from "bullmq";

export function isQueueEnabled(): boolean {
  return !!process.env.REDIS_URL;
}

/**
 * Build BullMQ connection options from REDIS_URL, or null when queues are
 * disabled. `maxRetriesPerRequest: null` is required by BullMQ workers.
 */
export function connectionOptions(): ConnectionOptions | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    db: u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
    tls: u.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
