import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-guards";
import { processRfq } from "@/lib/services/rfq-processing";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;
  const { id } = await params;
  const result = await processRfq(id, user!.id);
  return NextResponse.json({ ok: true, ...result });
}
