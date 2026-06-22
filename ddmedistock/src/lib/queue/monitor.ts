// Queue monitoring — counts per queue + dead-letter queue.
//
// Powers the admin queue dashboard endpoint. Returns a disabled marker when
// REDIS_URL is unset so the UI can show "queues not configured" rather than
// erroring.

import { getQueue, getDlq } from "./queues";
import { isQueueEnabled } from "./connection";
import { ALL_QUEUES } from "./config";

export type QueueStats = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  dead: number; // jobs in the dead-letter queue
};

export type QueueMonitorResult =
  | { enabled: false }
  | { enabled: true; queues: QueueStats[] };

export async function getQueueStats(): Promise<QueueMonitorResult> {
  if (!isQueueEnabled()) return { enabled: false };

  const queues: QueueStats[] = [];
  for (const name of ALL_QUEUES) {
    const q = getQueue(name);
    const dlq = getDlq(name);
    if (!q) continue;
    const counts = await q.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    const dead = dlq ? await dlq.getJobCounts("waiting", "completed", "failed") : { waiting: 0, completed: 0, failed: 0 };
    queues.push({
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      dead: (dead.waiting ?? 0) + (dead.completed ?? 0) + (dead.failed ?? 0),
    });
  }
  return { enabled: true, queues };
}
