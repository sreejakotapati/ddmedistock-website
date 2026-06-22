import { redirect } from "next/navigation";
import { LayoutDashboard, Package, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PortalShell, type NavItem } from "@/components/portal/shell";

const nav: NavItem[] = [
  { href: "/vendor", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/vendor/catalog", label: "Catalog & Stock", icon: <Package size={18} /> },
  { href: "/vendor/compliance", label: "Compliance", icon: <ShieldCheck size={18} /> },
];

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <PortalShell nav={nav} userName={user.name} roleLabel={user.vendor?.name ?? "Vendor Portal"}>
      {children}
    </PortalShell>
  );
}
