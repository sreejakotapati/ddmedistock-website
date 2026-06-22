import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { createAndProcessRfq } from "@/lib/services/rfq";
import { extractTextFromFile } from "@/lib/extract";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.CUSTOMER || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let title = "Untitled RFQ";
  let rawText = "";
  let sourceType = "TEXT";
  let sourceFileName: string | undefined;

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      title = String(form.get("title") || "Untitled RFQ");
      rawText = String(form.get("rawText") || "");
      const file = form.get("file");
      if (file && file instanceof File && file.size > 0) {
        sourceFileName = file.name;
        const { text, kind } = await extractTextFromFile(file);
        sourceType = kind;
        // Prefer extracted text; fall back to any pasted text.
        rawText = text.trim() ? text : rawText;
      }
    } else {
      const body = await req.json();
      title = String(body.title || "Untitled RFQ");
      if (Array.isArray(body.items) && body.items.length) {
        // Built from catalog search ("add to quotation request").
        sourceType = "CATALOG";
        rawText = body.items
          .map(
            (it: { name: string; quantity?: number; unit?: string }) =>
              `${it.name} - ${it.quantity ?? 1} ${it.unit ?? "Unit"}`,
          )
          .join("\n");
      } else {
        rawText = String(body.rawText || "");
        sourceType = String(body.sourceType || "TEXT");
      }
    }
  } catch {
    return NextResponse.json({ error: "Could not read request" }, { status: 400 });
  }

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "No requirement text could be read. Paste text or upload a CSV/Excel file." },
      { status: 400 },
    );
  }

  const rfq = await createAndProcessRfq({
    title,
    rawText,
    sourceType,
    sourceFileName,
    organizationId: user.organizationId,
    createdById: user.id,
  });

  return NextResponse.json({ ok: true, id: rfq.id, reference: rfq.reference });
}
