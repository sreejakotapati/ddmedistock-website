import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OrganizationPage() {
  const user = await getCurrentUser();
  const org = await prisma.organization.findUnique({
    where: { id: user!.organizationId! },
    include: { users: true },
  });

  return (
    <>
      <PageHeader title="Organization" description="Your organization profile and team members." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={org?.name} />
            <Row label="Type" value={org?.type} />
            <Row label="GSTIN" value={org?.gstin || "—"} />
            <Row label="Phone" value={org?.phone || "—"} />
            <Row label="Address" value={org?.address || "—"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Team Members ({org?.users.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {org?.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <div>
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{u.email}</div>
                </div>
                <Badge tone="blue">{u.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b border-[var(--border)] pb-2 last:border-0">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
