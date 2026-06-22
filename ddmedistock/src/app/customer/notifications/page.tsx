import Link from "next/link";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const notes = await prisma.notification.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  // Mark all as read on view.
  await prisma.notification.updateMany({ where: { userId: user!.id, read: false }, data: { read: true } });

  return (
    <>
      <PageHeader title="Notifications" />
      {notes.length === 0 ? (
        <EmptyState title="No notifications" hint="You'll be notified when quotations are ready." />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => {
            const inner = (
              <div className={`flex gap-3 rounded-xl border border-[var(--border)] bg-white p-4 ${!n.read ? "ring-1 ring-sky-200" : ""}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-50 text-[var(--primary)]"><Bell size={16} /></span>
                <div className="min-w-0">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-[var(--muted-foreground)]">{n.body}</div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">{formatDateTime(n.createdAt)}</div>
                </div>
              </div>
            );
            return n.link ? <Link key={n.id} href={n.link}>{inner}</Link> : <div key={n.id}>{inner}</div>;
          })}
        </div>
      )}
    </>
  );
}
