import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { UserManager } from "@/components/admin/user-manager";
import { ROLES, STAFF_ROLES } from "@/lib/constants";

export default async function AdminUsers() {
  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.SUPER_ADMIN) redirect("/admin");

  const users = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <>
      <PageHeader title="User Management" description="Super Admin: create staff accounts and assign roles (Admin, Procurement Manager, Super Admin)." />
      <UserManager users={users} selfId={user.id} />
    </>
  );
}
