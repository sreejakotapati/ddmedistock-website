import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { MarginManager } from "@/components/admin/margin-manager";

export default async function AdminMargins() {
  const rules = await prisma.marginRule.findMany({ orderBy: { markupPct: "asc" } });
  return (
    <>
      <PageHeader title="Margin Engine" description="Internal markup rules applied when AI drafts quotation pricing. Never visible to customers." />
      <MarginManager rules={rules.map((r) => ({ id: r.id, name: r.name, originType: r.originType, markupPct: r.markupPct }))} />
    </>
  );
}
