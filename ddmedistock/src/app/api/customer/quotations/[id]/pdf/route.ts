// Customer quotation PDF — the customer-facing document.
// Strictly excludes cost, margin, vendor and internal notes. Customers may
// only download PUBLISHED quotations belonging to their own organization.

import { getCurrentUser } from "@/lib/auth";
import { QUOTATION_STATUS } from "@/lib/constants";
import { loadQuotation, toCustomerData } from "@/lib/services/pdf/quotation-data";
import { buildCustomerQuotePdf } from "@/lib/services/pdf/quotation-pdf";
import { audit } from "@/lib/services/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const q = await loadQuotation(id);
  if (!q) return Response.json({ error: "Not found" }, { status: 404 });

  // Customers: only PUBLISHED quotations, only for their own organization.
  const isStaff = !["CUSTOMER", "VENDOR"].includes(user.role);
  if (!isStaff) {
    if (q.status !== QUOTATION_STATUS.PUBLISHED || q.rfq.organizationId !== user.organizationId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const bytes = await buildCustomerQuotePdf(toCustomerData(q));
  await audit(user.id, "QUOTATION_PDF_CUSTOMER", "Quotation", id, {});
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quotation-${q.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
