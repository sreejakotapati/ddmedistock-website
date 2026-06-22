import { prisma } from "@/lib/db";
import { RFQ_STATUS } from "@/lib/constants";
import { processRfq } from "./rfq-processing";
import { audit } from "./audit";
import { enqueue } from "@/lib/queue/producer";
import { QUEUE_NAMES } from "@/lib/queue/config";
import { notifyRfqSubmitted } from "./notifications";

function genReference() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RFQ-${y}-${rand}`;
}

export async function createAndProcessRfq(opts: {
  title: string;
  rawText: string;
  sourceType: string;
  sourceFileName?: string;
  organizationId: string;
  createdById: string;
}) {
  const rfq = await prisma.rFQ.create({
    data: {
      reference: genReference(),
      title: opts.title || "Untitled RFQ",
      rawText: opts.rawText,
      sourceType: opts.sourceType,
      sourceFileName: opts.sourceFileName,
      status: RFQ_STATUS.UNDER_REVIEW,
      organizationId: opts.organizationId,
      createdById: opts.createdById,
    },
  });

  await audit(opts.createdById, "RFQ_CREATED", "RFQ", rfq.id, { sourceType: opts.sourceType });

  // Acknowledge receipt to the submitter (in-app + email).
  await notifyRfqSubmitted(rfq.id);

  // Enqueue AI extraction + matching for a worker to process. When REDIS_URL is
  // unset, enqueue() runs it inline so behaviour is identical without Redis.
  await enqueue(
    QUEUE_NAMES.RFQ_PROCESSING,
    "process-rfq",
    { rfqId: rfq.id, actorId: opts.createdById },
    async (data) => {
      await processRfq(data.rfqId, data.actorId);
    },
  );

  return rfq;
}

/**
 * Create an RFQ from an uploaded document (PDF / image / scanned). The RFQ is
 * created immediately with placeholder text, then the OCR pipeline extracts the
 * text and runs parse + match. Via the OCR queue (inline when Redis is off).
 */
export async function createRfqFromUpload(opts: {
  title: string;
  dataBase64: string;
  contentType?: string;
  filename?: string;
  sourceType: string;
  organizationId: string;
  createdById: string;
}) {
  const rfq = await prisma.rFQ.create({
    data: {
      reference: genReference(),
      title: opts.title || opts.filename || "Untitled RFQ",
      rawText: "", // filled in by OCR
      sourceType: opts.sourceType,
      sourceFileName: opts.filename,
      status: RFQ_STATUS.UNDER_REVIEW,
      organizationId: opts.organizationId,
      createdById: opts.createdById,
    },
  });

  await audit(opts.createdById, "RFQ_CREATED", "RFQ", rfq.id, { sourceType: opts.sourceType, ocr: true });
  await notifyRfqSubmitted(rfq.id);

  const { ingestOcr } = await import("./ocr/ingest");
  await enqueue(
    QUEUE_NAMES.OCR_PROCESSING,
    "ocr-ingest",
    {
      rfqId: rfq.id,
      dataBase64: opts.dataBase64,
      contentType: opts.contentType,
      filename: opts.filename,
      actorId: opts.createdById,
    },
    async (data) => {
      await ingestOcr(data);
    },
  );

  return rfq;
}
