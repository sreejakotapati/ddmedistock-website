import Link from "next/link";
import { Package, Boxes, ShieldCheck, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, STATUS_TONE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function VendorDashboard() {
  const user = await getCurrentUser();
  const vendor = await prisma.vendor.findUnique({
    where: { id: user!.vendorId! },
    include: { vendorProducts: { include: { product: true } } },
  });

  const totalStock = vendor?.vendorProducts.reduce((s, vp) => s + vp.stock, 0) ?? 0;
  const hasCompliance = !!(vendor?.cdscoLicense || vendor?.isoCert);

  return (
    <>
      <PageHeader
        title={`Welcome, ${vendor?.name}`}
        description="Manage your catalog, stock and compliance documents."
        action={<Link href="/vendor/catalog"><Button><Package size={16} /> Manage catalog</Button></Link>}
      />

      {vendor?.status !== "APPROVED" && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3">
            <Clock className="text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Your vendor account is <Badge tone={STATUS_TONE[vendor?.status ?? "PENDING"] ?? "amber"}>{vendor?.status}</Badge></p>
              <p className="text-sm text-amber-700">Complete your compliance documents to speed up approval by our admin team.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Catalog Products" value={vendor?.vendorProducts.length ?? 0} icon={<Package size={18} />} />
        <StatCard label="Total Stock" value={totalStock} icon={<Boxes size={18} />} />
        <StatCard label="Origin" value={vendor?.originType ?? "—"} icon={<Package size={18} />} />
        <StatCard label="Compliance" value={hasCompliance ? "On file" : "Pending"} icon={<ShieldCheck size={18} />} />
      </div>
    </>
  );
}
