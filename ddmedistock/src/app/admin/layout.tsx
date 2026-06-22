import { redirect } from "next/navigation";
import {
  LayoutDashboard, FileSearch, FileText, Package, Store, Percent, ScrollText, Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PortalShell, type NavItem } from "@/components/portal/shell";
import { ROLE_LABELS, ROLES } from "@/lib/constants";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nav: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/admin/rfqs", label: "RFQ Management", icon: <FileSearch size={18} /> },
    { href: "/admin/quotations", label: "Quotations", icon: <FileText size={18} /> },
    { href: "/admin/products", label: "Product Master", icon: <Package size={18} /> },
    { href: "/admin/vendors", label: "Vendors", icon: <Store size={18} /> },
    { href: "/admin/margins", label: "Margin Engine", icon: <Percent size={18} /> },
    { href: "/admin/audit", label: "Audit Logs", icon: <ScrollText size={18} /> },
  ];
  // Super Admin can manage staff users & roles.
  if (user.role === ROLES.SUPER_ADMIN) {
    nav.push({ href: "/admin/users", label: "User Management", icon: <Users size={18} /> });
  }

  return (
    <PortalShell nav={nav} userName={`${user.name} · ${ROLE_LABELS[user.role] ?? user.role}`} roleLabel="Admin Portal">
      {children}
    </PortalShell>
  );
}
