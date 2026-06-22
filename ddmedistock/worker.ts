// Worker entrypoint — run the BullMQ workers in a separate process.
//
//   npm run worker
//
// Requires REDIS_URL. Handles graceful shutdown so in-flight jobs finish.

import { startWorkers } from "./src/lib/queue/workers";
import { closeQueues, isQueueEnabled } from "./src/lib/queue/queues";
import { logger } from "./src/lib/observability/logger";

async function main() {
  if (!isQueueEnabled()) {
    logger.error("REDIS_URL not set — cannot start workers. Exiting.");
    process.exit(1);
  }
  const workers = await startWorkers();
  logger.info({ workers: workers.length }, "worker process ready");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "worker shutting down");
    await Promise.all(workers.map((w) => w.close()));
    await closeQueues();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err: (err as Error).message }, "worker failed to start");
  process.exit(1);
});
