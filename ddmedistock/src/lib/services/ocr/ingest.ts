// OCR ingest job handler.
//
// Given an uploaded document (base64) attached to an existing RFQ, extract its
// text, store it on the RFQ, then run the normal AI parse + match pipeline.
// Used by the ocr-processing queue worker (and inline when Redis is disabled).

import { prisma } from "@/lib/db";
import { extractDocumentText, type SourceType } from "./extract";
import { processRfq } from "../rfq-processing";
import { moduleLogger } from "@/lib/observability/logger";

const log = moduleLogger("ocr.ingest");

export type OcrJob = {
  rfqId: string;
  dataBase64: string;
  contentType?: string;
  filename?: string;
  sourceType?: SourceType;
  actorId?: string;
};

export async function ingestOcr(job: OcrJob): Promise<{ chars: number; method: string }> {
  const buffer = Buffer.from(job.dataBase64, "base64");
  const result = await extractDocumentText(buffer, {
    contentType: job.contentType,
    filename: job.filename,
    sourceType: job.sourceType,
  });

  await prisma.rFQ.update({
    where: { id: job.rfqId },
    data: { rawText: result.text },
  });
  log.info({ rfqId: job.rfqId, method: result.method, chars: result.text.length, pages: result.pages }, "ocr.extracted");

  // Continue the standard pipeline (parse + match) now that we have text.
  await processRfq(job.rfqId, job.actorId);
  return { chars: result.text.length, method: result.method };
}
