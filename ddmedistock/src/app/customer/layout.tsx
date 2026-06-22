import { redirect } from "next/navigation";
import {
  LayoutDashboard, Upload, FileText, Inbox, Search, Bell, Building2,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PortalShell, type NavItem } from "@/components/portal/shell";

const nav: NavItem[] = [
  { href: "/customer", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/customer/rfqs/new", label: "New RFQ", icon: <Upload size={18} /> },
  { href: "/customer/rfqs", label: "RFQ History", icon: <FileText size={18} /> },
  { href: "/customer/catalog", label: "Product Search", icon: <Search size={18} /> },
  { href: "/customer/quotations", label: "Quotation Inbox", icon: <Inbox size={18} /> },
  { href: "/customer/notifications", label: "Notifications", icon: <Bell size={18} /> },
  { href: "/customer/organization", label: "Organization", icon: <Building2 size={18} /> },
];

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PortalShell nav={nav} userName={user.name} roleLabel={user.organization?.name ?? "Customer Portal"}>
      {children}
    </PortalShell>
  );
}
