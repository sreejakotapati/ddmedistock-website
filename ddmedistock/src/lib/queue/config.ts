// Queue configuration — pure, dependency-free, unit-testable.
//
// Defines the six queues, their default job options (retry + backoff), and the
// dead-letter naming convention. Kept separate from BullMQ so the policy can be
// asserted in tests without a Redis connection.

export const QUEUE_NAMES = {
  RFQ_PROCESSING: "rfq-processing",
  OCR_PROCESSING: "ocr-processing",
  AI_MATCHING: "ai-matching",
  QUOTATION_GENERATION: "quotation-generation",
  NOTIFICATION_DELIVERY: "notification-delivery",
  EMAIL_DELIVERY: "email-delivery",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUES: QueueName[] = Object.values(QUEUE_NAMES);

/** Suffix appended to a queue name to form its dead-letter queue. */
export const DLQ_SUFFIX = ".dlq";

/** Name of the dead-letter queue for a given queue. */
export function dlqName(queue: QueueName): string {
  return `${queue}${DLQ_SUFFIX}`;
}

/** True if `name` is a dead-letter queue. */
export function isDlqName(name: string): boolean {
  return name.endsWith(DLQ_SUFFIX);
}

export type JobOptions = {
  attempts: number;
  backoff: { type: "exponential" | "fixed"; delay: number };
  removeOnComplete: number | boolean;
  removeOnFail: number | boolean;
};

// Per-queue retry policy. Delivery queues (email/notification) get more
// attempts since transient provider errors are common; processing queues fewer.
const DEFAULTS: JobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: false, // keep failed jobs for inspection / DLQ routing
};

const OVERRIDES: Partial<Record<QueueName, Partial<JobOptions>>> = {
  [QUEUE_NAMES.EMAIL_DELIVERY]: { attempts: 5, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.NOTIFICATION_DELIVERY]: { attempts: 5 },
  [QUEUE_NAMES.OCR_PROCESSING]: { attempts: 2, backoff: { type: "exponential", delay: 3000 } },
};

/** Resolve the effective job options for a queue. */
export function jobOptions(queue: QueueName): JobOptions {
  return { ...DEFAULTS, ...OVERRIDES[queue] } as JobOptions;
}

/**
 * Decide whether a failed job has exhausted its retries and should be routed to
 * the dead-letter queue. Pure so it can be unit-tested.
 */
export function shouldDeadLetter(attemptsMade: number, maxAttempts: number): boolean {
  return attemptsMade >= maxAttempts;
}
