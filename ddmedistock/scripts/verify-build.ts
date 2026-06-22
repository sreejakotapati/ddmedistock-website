// Build verification: TypeScript compilation, Next.js production build, and
// Prisma schema validity. Run standalone: `npx tsx scripts/verify-build.ts`.

import { Reporter, printSection, sh, type Section } from "./verify/lib";

export async function verifyBuild(): Promise<Section> {
  const r = new Reporter("Build");

  // 1. TypeScript compilation.
  await r.check("TypeScript compilation (tsc --noEmit)", async () => {
    const { code, out } = await sh("npx tsc --noEmit");
    if (code !== 0) throw new Error(out.split("\n").filter(Boolean).slice(-5).join(" | ") || "tsc failed");
    return "no type errors";
  });

  // 3. Prisma schema validation (do this before build so a schema error is clear).
  await r.check("Prisma schema valid (prisma validate)", async () => {
    const { code, out } = await sh("npx prisma validate");
    if (code !== 0) throw new Error(out.split("\n").filter(Boolean).slice(-3).join(" | "));
    return "schema is valid";
  });

  await r.check("Prisma client generated", async () => {
    const { code } = await sh("test -d node_modules/.prisma/client");
    if (code !== 0) throw new Error("run `npx prisma generate`");
    return ".prisma/client present";
  });

  // 2. Next.js production build (longest step).
  await r.check("Next.js production build (next build)", async () => {
    const { code, out } = await sh("npm run build", 600_000);
    if (code !== 0) throw new Error(out.split("\n").filter(Boolean).slice(-6).join(" | "));
    const standalone = await sh("test -f .next/standalone/server.js");
    return standalone.code === 0 ? "compiled; standalone output emitted" : "compiled (no standalone output)";
  });

  // Lint is advisory for deployability — a warning, not a hard fail.
  await r.check("ESLint (advisory)", async () => {
    const { code, out } = await sh("npm run lint");
    if (code !== 0) throw new Error(out.split("\n").filter(Boolean).slice(-4).join(" | "));
    return "no lint errors";
  }, true);

  return r.section();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyBuild().then((s) => process.exit(printSection(s) === "FAIL" ? 1 : 0));
}
