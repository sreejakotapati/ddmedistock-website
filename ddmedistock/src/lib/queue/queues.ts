// Queue instances + dead-letter queues (BullMQ).
//
// Lazily constructs a Queue per name (and its DLQ) over the shared Redis
// connection. Returns null when queues are disabled so callers can fall back to
// inline execution.

import { Queue } from "bullmq";
import { connectionOptions, isQueueEnabled } from "./connection";
import { ALL_QUEUES, dlqName, jobOptions, type QueueName } from "./config";

const globalForQueues = globalThis as unknown as {
  __queues?: Map<string, Queue>;
};

function registry(): Map<string, Queue> {
  if (!globalForQueues.__queues) globalForQueues.__queues = new Map();
  return globalForQueues.__queues;
}

/** Get (or create) the Queue for `name`, or null when queues are disabled. */
export function getQueue(name: QueueName): Queue | null {
  const connection = connectionOptions();
  if (!connection) return null;
  const reg = registry();
  if (!reg.has(name)) {
    reg.set(name, new Queue(name, { connection, defaultJobOptions: jobOptions(name) }));
  }
  return reg.get(name)!;
}

/** Get (or create) the dead-letter Queue for `name`. */
export function getDlq(name: QueueName): Queue | null {
  const connection = connectionOptions();
  if (!connection) return null;
  const dlq = dlqName(name);
  const reg = registry();
  if (!reg.has(dlq)) {
    // DLQ jobs are terminal — no retries, retained for inspection.
    reg.set(dlq, new Queue(dlq, { connection, defaultJobOptions: { attempts: 1, removeOnComplete: false } }));
  }
  return reg.get(dlq)!;
}

/** Close all queues (graceful shutdown / tests). */
export async function closeQueues(): Promise<void> {
  if (!globalForQueues.__queues) return;
  await Promise.all([...globalForQueues.__queues.values()].map((q) => q.close()));
  globalForQueues.__queues = undefined;
}

export { ALL_QUEUES, isQueueEnabled };
