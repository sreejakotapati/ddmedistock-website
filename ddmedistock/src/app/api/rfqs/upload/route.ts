// RFQ document upload (PDF / image / scanned) — customer only.
// Accepts multipart/form-data with a `file` and optional `title`, runs the OCR
// pipeline, and creates an RFQ. Large files are bounded to protect the server.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createRfqFromUpload } from "@/lib/services/rfq";
import { detectSourceType } from "@/lib/services/ocr/extract";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "Expected a multipart 'file' field" }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });
  }

  const title = (form.get("title") as string) || file.name;
  const buffer = Buffer.from(await file.arrayBuffer());
  const sourceType = detectSourceType(file.type, file.name);

  const rfq = await createRfqFromUpload({
    title,
    dataBase64: buffer.toString("base64"),
    contentType: file.type,
    filename: file.name,
    sourceType,
    organizationId: user.organizationId!,
    createdById: user.id,
  });

  return NextResponse.json({ ok: true, rfqId: rfq.id, reference: rfq.reference, sourceType });
}
