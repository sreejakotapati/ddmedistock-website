import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding DDMediStock…");

  // Clean slate (dev only).
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.quotationVersion.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.productMatch.deleteMany(),
    prisma.rFQLineItem.deleteMany(),
    prisma.rFQ.deleteMany(),
    prisma.vendorCost.deleteMany(),
    prisma.vendorProduct.deleteMany(),
    prisma.productAttribute.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.marginRule.deleteMany(),
    prisma.user.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  const pw = await bcrypt.hash("password123", 10);

  // Staff (back-office) users — full RBAC across Admin portal.
  await prisma.user.createMany({
    data: [
      { name: "Procurement Admin", email: "admin@ddmedistock.com", passwordHash: pw, role: "ADMIN" },
      { name: "Priya Nair", email: "manager@ddmedistock.com", passwordHash: pw, role: "PROCUREMENT_MANAGER" },
      { name: "Super Admin", email: "superadmin@ddmedistock.com", passwordHash: pw, role: "SUPER_ADMIN" },
    ],
  });

  // Customer org + user
  const org = await prisma.organization.create({
    data: { name: "City General Hospital", type: "HOSPITAL", gstin: "29ABCDE1234F1Z5", phone: "+91 80 1234 5678", address: "MG Road, Bengaluru" },
  });
  await prisma.user.create({
    data: { name: "Asha Verma", email: "procurement@cityhospital.in", passwordHash: pw, role: "CUSTOMER", organizationId: org.id },
  });

  // Vendors
  const domestic = await prisma.vendor.create({
    data: { name: "MedSupply Pvt Ltd", email: "sales@medsupply.in", originType: "DOMESTIC", status: "APPROVED", cdscoLicense: "MD-2021-0098", isoCert: "ISO 13485:2016" },
  });
  await prisma.user.create({
    data: { name: "Ravi Kumar", email: "sales@medsupply.in", passwordHash: pw, role: "VENDOR", vendorId: domestic.id },
  });
  const imported = await prisma.vendor.create({
    data: { name: "GlobalMed Imports", email: "contact@globalmed.com", originType: "IMPORTED", status: "APPROVED", cdscoLicense: "MD-2020-0451", isoCert: "ISO 13485:2016", importCert: "IMP-2022-7781" },
  });
  const pendingVendor = await prisma.vendor.create({
    data: { name: "HealthFirst Distributors", email: "info@healthfirst.in", originType: "DOMESTIC", status: "PENDING" },
  });
  await prisma.user.create({
    data: { name: "Neha Shah", email: "info@healthfirst.in", passwordHash: pw, role: "VENDOR", vendorId: pendingVendor.id },
  });

  // Margin rules
  await prisma.marginRule.createMany({
    data: [
      { name: "Domestic standard", originType: "DOMESTIC", markupPct: 18 },
      { name: "Imported premium", originType: "IMPORTED", markupPct: 28 },
      { name: "Default", originType: null, markupPct: 20 },
    ],
  });

  // Categories
  const cat = async (name: string) => (await prisma.category.create({ data: { name } })).id;
  const cSyr = await cat("Syringes & Needles");
  const cGlove = await cat("Gloves");
  const cIV = await cat("IV & Infusion");

  type P = { name: string; brand: string; origin: "DOMESTIC" | "IMPORTED"; uom: string; cat: string; attrs: Record<string, string>; cost: number; vendor: string };
  const products: P[] = [
    { name: "Disposable Syringe 5ml Sterile", brand: "Romsons", origin: "DOMESTIC", uom: "Nos", cat: cSyr, attrs: { volume: "5ml", sterility: "Sterile", usage: "Disposable" }, cost: 3.2, vendor: domestic.id },
    { name: "Disposable Syringe 5ml Sterile", brand: "BD", origin: "IMPORTED", uom: "Nos", cat: cSyr, attrs: { volume: "5ml", sterility: "Sterile", usage: "Disposable" }, cost: 5.5, vendor: imported.id },
    { name: "Disposable Syringe 10ml Sterile", brand: "Romsons", origin: "DOMESTIC", uom: "Nos", cat: cSyr, attrs: { volume: "10ml", sterility: "Sterile" }, cost: 4.1, vendor: domestic.id },
    { name: "Hypodermic Needle 22G", brand: "Polymed", origin: "DOMESTIC", uom: "Nos", cat: cSyr, attrs: { gauge: "22G", sterility: "Sterile" }, cost: 1.4, vendor: domestic.id },
    { name: "Hypodermic Needle 22G", brand: "BD", origin: "IMPORTED", uom: "Nos", cat: cSyr, attrs: { gauge: "22G", sterility: "Sterile" }, cost: 2.6, vendor: imported.id },
    { name: "Hypodermic Needle 24G", brand: "Polymed", origin: "DOMESTIC", uom: "Nos", cat: cSyr, attrs: { gauge: "24G", sterility: "Sterile" }, cost: 1.5, vendor: domestic.id },
    { name: "Surgical Gloves Latex Medium Sterile", brand: "Romsons", origin: "DOMESTIC", uom: "Box", cat: cGlove, attrs: { material: "latex", size: "medium", sterility: "Sterile" }, cost: 210, vendor: domestic.id },
    { name: "Surgical Gloves Latex Medium Sterile", brand: "Ansell", origin: "IMPORTED", uom: "Box", cat: cGlove, attrs: { material: "latex", size: "medium", sterility: "Sterile" }, cost: 320, vendor: imported.id },
    { name: "Examination Gloves Nitrile Large", brand: "Nulife", origin: "DOMESTIC", uom: "Box", cat: cGlove, attrs: { material: "nitrile", size: "large", usage: "Disposable" }, cost: 180, vendor: domestic.id },
    { name: "Examination Gloves Nitrile Large", brand: "3M", origin: "IMPORTED", uom: "Box", cat: cGlove, attrs: { material: "nitrile", size: "large" }, cost: 260, vendor: imported.id },
    { name: "IV Cannula 18G", brand: "Polymed", origin: "DOMESTIC", uom: "Pcs", cat: cIV, attrs: { gauge: "18G", sterility: "Sterile" }, cost: 12.5, vendor: domestic.id },
    { name: "IV Cannula 18G", brand: "BD Venflon", origin: "IMPORTED", uom: "Pcs", cat: cIV, attrs: { gauge: "18G", sterility: "Sterile" }, cost: 22, vendor: imported.id },
    { name: "IV Cannula 20G", brand: "Polymed", origin: "DOMESTIC", uom: "Pcs", cat: cIV, attrs: { gauge: "20G", sterility: "Sterile" }, cost: 12 , vendor: domestic.id },
    { name: "3-Way Stopcock", brand: "Romsons", origin: "DOMESTIC", uom: "Nos", cat: cIV, attrs: { sterility: "Sterile" }, cost: 8.5, vendor: domestic.id },
    { name: "Infusion Set", brand: "Polymed", origin: "DOMESTIC", uom: "Nos", cat: cIV, attrs: { sterility: "Sterile" }, cost: 9.8, vendor: domestic.id },
  ];

  for (const p of products) {
    const searchText = [p.name, p.brand, ...Object.entries(p.attrs).map(([k, v]) => `${k} ${v}`)].join(" ").toLowerCase();
    const product = await prisma.product.create({
      data: {
        name: p.name, brand: p.brand, originType: p.origin, uom: p.uom, categoryId: p.cat, searchText,
        attributes: { create: Object.entries(p.attrs).map(([key, value]) => ({ key, value })) },
      },
    });
    const vp = await prisma.vendorProduct.create({
      data: { vendorId: p.vendor, productId: product.id, stock: Math.floor(Math.random() * 5000) + 200, leadTimeDays: p.origin === "IMPORTED" ? 21 : 7 },
    });
    await prisma.vendorCost.create({ data: { vendorProductId: vp.id, cost: p.cost } });
  }

  console.log("✅ Seed complete. All passwords: password123");
  console.log("   Super Admin          : superadmin@ddmedistock.com");
  console.log("   Admin                : admin@ddmedistock.com");
  console.log("   Procurement Manager  : manager@ddmedistock.com");
  console.log("   Customer             : procurement@cityhospital.in");
  console.log("   Vendor               : sales@medsupply.in");
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
