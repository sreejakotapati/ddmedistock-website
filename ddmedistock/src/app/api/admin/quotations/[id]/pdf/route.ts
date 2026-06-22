// Internal quotation PDF — Admin / Procurement Manager only.
// Returns the confidential document with cost, margin, vendor and P&L.

import { requireStaff } from "@/lib/api-guards";
import { can, CAPABILITIES } from "@/lib/rbac";
import { loadQuotation, toInternalData } from "@/lib/services/pdf/quotation-data";
import { buildInternalQuotePdf } from "@/lib/services/pdf/quotation-pdf";
import { audit } from "@/lib/services/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;
  // Internal pricing visibility is capability-gated (defence in depth).
  if (!can(user!.role, CAPABILITIES.PRICING_INTERNAL_VIEW)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const q = await loadQuotation(id);
  if (!q) return Response.json({ error: "Not found" }, { status: 404 });

  const bytes = await buildInternalQuotePdf(toInternalData(q));
  await audit(user!.id, "QUOTATION_PDF_INTERNAL", "Quotation", id, {});
  return pdfResponse(bytes, `quotation-${q.number}-internal.pdf`);
}

function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
