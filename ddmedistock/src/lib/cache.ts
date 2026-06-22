// Caching layer — Redis-backed with an in-memory fallback.
//
// Uses the same REDIS_URL as the queue layer when available; otherwise a
// process-local Map with TTL so caching still works (per-instance) in dev and
// when Redis is absent. cached() memoizes an async producer by key.

import { moduleLogger } from "@/lib/observability/logger";

const log = moduleLogger("cache");

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(prefix: string): Promise<void>;
}

/** Process-local TTL cache. Self-expires on read. */
export class MemoryCache implements CacheStore {
  private store = new Map<string, { value: string; expires: number }>();

  async get(key: string): Promise<string | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expires <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  /** Delete all keys starting with `prefix` (cache invalidation by namespace). */
  async del(prefix: string): Promise<void> {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }
}

// Minimal Redis client surface we rely on (ioredis is present transitively via
// bullmq). Kept narrow so we don't depend on ioredis' full type surface.
interface MiniRedis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: string, ttl: number): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  del(...keys: string[]): Promise<number>;
}

/** Redis-backed cache (lazy client; only constructed when REDIS_URL set). */
class RedisCache implements CacheStore {
  private clientPromise: Promise<MiniRedis> | null = null;

  private client(): Promise<MiniRedis> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const mod = (await import("ioredis")) as unknown as { default: new (url: string) => MiniRedis };
        return new mod.default(process.env.REDIS_URL!);
      })();
    }
    return this.clientPromise;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await (await this.client()).get(key);
    } catch (e) {
      log.warn({ err: (e as Error).message }, "cache.get_failed");
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await (await this.client()).set(key, value, "EX", ttlSeconds);
    } catch (e) {
      log.warn({ err: (e as Error).message }, "cache.set_failed");
    }
  }

  async del(prefix: string): Promise<void> {
    try {
      const c = await this.client();
      const keys = await c.keys(`${prefix}*`);
      if (keys.length) await c.del(...keys);
    } catch (e) {
      log.warn({ err: (e as Error).message }, "cache.del_failed");
    }
  }
}

const globalForCache = globalThis as unknown as { __cache?: CacheStore };

export function cache(): CacheStore {
  if (!globalForCache.__cache) {
    globalForCache.__cache = process.env.REDIS_URL ? new RedisCache() : new MemoryCache();
  }
  return globalForCache.__cache;
}

/**
 * Memoize an async producer by key. On a cache miss runs `produce`, stores the
 * JSON result for `ttlSeconds`, and returns it. Cache failures degrade to
 * always calling `produce`.
 */
export async function cached<T>(key: string, ttlSeconds: number, produce: () => Promise<T>): Promise<T> {
  const c = cache();
  const hit = await c.get(key);
  if (hit !== null) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      /* fall through to recompute */
    }
  }
  const value = await produce();
  await c.set(key, JSON.stringify(value), ttlSeconds);
  return value;
}

/** Invalidate every cache entry under a namespace prefix. */
export async function invalidate(prefix: string): Promise<void> {
  await cache().del(prefix);
}
