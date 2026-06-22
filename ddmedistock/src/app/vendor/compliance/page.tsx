import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { ComplianceForm } from "@/components/vendor/compliance-form";

export default async function VendorCompliance() {
  const user = await getCurrentUser();
  const vendor = await prisma.vendor.findUnique({ where: { id: user!.vendorId! } });

  return (
    <>
      <PageHeader title="Compliance Documents" description="Required: CDSCO License, ISO Certifications, Import Certifications." />
      <div className="max-w-xl">
        <ComplianceForm
          initial={{
            cdscoLicense: vendor?.cdscoLicense ?? "",
            isoCert: vendor?.isoCert ?? "",
            importCert: vendor?.importCert ?? "",
          }}
        />
      </div>
    </>
  );
}
