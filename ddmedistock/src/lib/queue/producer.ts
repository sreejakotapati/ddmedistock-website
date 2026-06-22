// Job producers with graceful fallback.
//
// enqueue() adds a job when queues are enabled; otherwise it runs the provided
// inline handler synchronously, so the app behaves identically with or without
// Redis (queues add throughput/resilience, not new behaviour). This keeps the
// existing synchronous RFQ flow working unchanged when REDIS_URL is unset.

import { getQueue } from "./queues";
import { isQueueEnabled } from "./connection";
import { type QueueName } from "./config";
import { moduleLogger } from "@/lib/observability/logger";

const log = moduleLogger("queue.producer");

export type EnqueueResult =
  | { mode: "queued"; jobId: string }
  | { mode: "inline" };

/**
 * Enqueue a job, or run `inline` synchronously when queues are disabled.
 * @param queue   target queue name
 * @param jobName logical job name (for observability)
 * @param data    serializable payload
 * @param inline  fallback executed when queues are disabled
 */
export async function enqueue<T>(
  queue: QueueName,
  jobName: string,
  data: T,
  inline: (data: T) => Promise<void>,
): Promise<EnqueueResult> {
  if (isQueueEnabled()) {
    const q = getQueue(queue);
    if (q) {
      const job = await q.add(jobName, data);
      log.info({ queue, jobName, jobId: job.id }, "job.enqueued");
      return { mode: "queued", jobId: String(job.id) };
    }
  }
  // Fallback: execute now so the workflow still completes without Redis.
  log.debug({ queue, jobName }, "job.inline");
  await inline(data);
  return { mode: "inline" };
}
