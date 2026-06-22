// Queue workers.
//
// One Worker per queue, each delegating to the existing domain services. A
// shared `failed` handler routes permanently-failed jobs (retries exhausted)
// to the queue's dead-letter queue for later inspection/replay.

import { Worker, type Job } from "bullmq";
import { connectionOptions } from "./connection";
import { getDlq } from "./queues";
import { QUEUE_NAMES, jobOptions, shouldDeadLetter, type QueueName } from "./config";
import { moduleLogger } from "@/lib/observability/logger";
import { captureException } from "@/lib/observability/sentry";

const log = moduleLogger("queue.worker");

type Handler = (job: Job) => Promise<void>;

/** Build a Worker for a queue with DLQ-on-exhaustion wired up. */
function makeWorker(name: QueueName, handler: Handler): Worker {
  const connection = connectionOptions();
  if (!connection) throw new Error("Cannot start workers: REDIS_URL not set");

  const worker = new Worker(name, handler, { connection, concurrency: 5 });
  const { attempts } = jobOptions(name);

  worker.on("completed", (job) => log.info({ queue: name, jobId: job.id }, "job.completed"));

  worker.on("failed", async (job, err) => {
    const message = err?.message ?? "unknown";
    log.warn({ queue: name, jobId: job?.id, attemptsMade: job?.attemptsMade, err: message }, "job.failed");

    // Transient BullMQ lock/stall races ("missing lock … moveToFinished") are
    // not genuine job failures — ignore so we never dead-letter a job that
    // actually completed.
    if (/missing lock|could not renew lock|stalled/i.test(message)) return;

    // Only dead-letter when we have a real job with a numeric attempt count
    // that has exhausted its retries. Guarded so a malformed failed event
    // (job undefined) can never crash the handler.
    if (!job || typeof job.attemptsMade !== "number") return;
    if (!shouldDeadLetter(job.attemptsMade, attempts)) return;

    try {
      const dlq = getDlq(name);
      await dlq?.add("dead-letter", {
        originalQueue: name,
        originalJobName: job.name,
        data: job.data,
        failedReason: message,
        attemptsMade: job.attemptsMade,
        movedAt: new Date().toISOString(),
      });
      log.error({ queue: name, jobId: job.id }, "job.dead_lettered");
      await captureException(err, { queue: name, jobId: job.id, stage: "dead_letter" });
    } catch (dlqErr) {
      log.error({ queue: name, jobId: job.id, err: (dlqErr as Error).message }, "dead_letter.failed");
    }
  });

  return worker;
}

/**
 * Start all workers. Handlers are imported lazily to avoid pulling Prisma/AI
 * into the edge/build graph and to keep this module importable in tests.
 */
export async function startWorkers(): Promise<Worker[]> {
  const { processRfq } = await import("@/lib/services/rfq-processing");
  const { generateDraftQuotation } = await import("@/lib/services/quotation");
  const { sendEmail } = await import("@/lib/services/email");
  const { deliverNotification } = await import("@/lib/services/notify-delivery");
  const { ingestOcr } = await import("@/lib/services/ocr/ingest");

  const workers: Worker[] = [
    makeWorker(QUEUE_NAMES.RFQ_PROCESSING, async (job) => {
      await processRfq(job.data.rfqId, job.data.actorId);
    }),
    makeWorker(QUEUE_NAMES.OCR_PROCESSING, async (job) => {
      await ingestOcr(job.data);
    }),
    makeWorker(QUEUE_NAMES.AI_MATCHING, async (job) => {
      await processRfq(job.data.rfqId, job.data.actorId);
    }),
    makeWorker(QUEUE_NAMES.QUOTATION_GENERATION, async (job) => {
      await generateDraftQuotation(job.data.rfqId, job.data.actorId);
    }),
    makeWorker(QUEUE_NAMES.NOTIFICATION_DELIVERY, async (job) => {
      await deliverNotification(job.data);
    }),
    makeWorker(QUEUE_NAMES.EMAIL_DELIVERY, async (job) => {
      await sendEmail(job.data);
    }),
  ];

  log.info({ count: workers.length }, "workers.started");
  return workers;
}
