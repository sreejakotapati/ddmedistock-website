import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-guards";
import { generateDraftQuotation } from "@/lib/services/quotation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;
  const { id } = await params;
  const q = await generateDraftQuotation(id, user!.id);
  return NextResponse.json({ ok: true, quotationId: q.id });
}
