import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/api-guards";
import { submitForApproval, decideApproval } from "@/lib/services/quotation";
import { workflowHistory } from "@/lib/services/workflow-log";
import { ForbiddenError } from "@/lib/rbac";
import { InvalidTransitionError } from "@/lib/workflow";

const schema = z.object({
  action: z.enum(["SUBMIT", "APPROVE", "REJECT"]),
  note: z.string().optional(),
});

// GET → approval / workflow history for the quotation.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { deny } = await requireStaff();
  if (deny) return deny;
  const { id } = await params;
  return NextResponse.json({ history: await workflowHistory("QUOTATION", id) });
}

// POST → submit for approval, or approve / reject (capability-gated).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const actor = { id: user!.id, role: user!.role };

  try {
    if (parsed.data.action === "SUBMIT") {
      await submitForApproval(id, actor);
    } else {
      await decideApproval(id, parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED", actor, parsed.data.note);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof InvalidTransitionError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
