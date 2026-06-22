// Queue monitoring dashboard endpoint — staff only.
// GET → per-queue job counts (+ dead-letter totals), or { enabled: false }.

import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-guards";
import { getQueueStats } from "@/lib/queue/monitor";

export async function GET() {
  const { deny } = await requireStaff();
  if (deny) return deny;
  return NextResponse.json(await getQueueStats());
}
