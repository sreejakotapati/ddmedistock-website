import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-guards";
import { publishQuotation } from "@/lib/services/quotation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;
  const { id } = await params;
  await publishQuotation(id, user!.id, user!.role);
  return NextResponse.json({ ok: true });
}
