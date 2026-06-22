// Route accessibility verification (static): every API route exports at least
// one HTTP handler, every page exports a default component, and middleware
// guards each portal prefix. Static analysis — no server required.
// Run standalone: `npx tsx scripts/verify-routes.ts`.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Reporter, printSection, type Section } from "./verify/lib";

const HTTP = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function walk(dir: string, match: (f: string) => boolean): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, match));
    else if (match(p)) out.push(p);
  }
  return out;
}

export async function verifyRoutes(): Promise<Section> {
  const r = new Reporter("Routes");
  const root = process.cwd();
  const apiDir = join(root, "src/app/api");
  const appDir = join(root, "src/app");

  // API route handlers.
  const routeFiles = walk(apiDir, (f) => f.endsWith("route.ts"));
  r.assert(routeFiles.length > 0, "API route files discovered", `${routeFiles.length} route.ts files`);
  let badApi = 0;
  for (const f of routeFiles) {
    const src = readFileSync(f, "utf8");
    const has = HTTP.some((m) => new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src));
    if (!has) {
      badApi++;
      r.fail(`API handler: ${f.replace(root + "/", "")}`, "no GET/POST/PATCH/... export");
    }
  }
  r.assert(badApi === 0, "All API routes export an HTTP handler", `${routeFiles.length - badApi}/${routeFiles.length} valid`);

  // Page components.
  const pageFiles = walk(appDir, (f) => f.endsWith("page.tsx"));
  let badPage = 0;
  for (const f of pageFiles) {
    const src = readFileSync(f, "utf8");
    if (!/export\s+default\s+(async\s+)?function|export\s+default\s+\w+/.test(src)) {
      badPage++;
      r.fail(`Page component: ${f.replace(root + "/", "")}`, "no default export");
    }
  }
  r.assert(badPage === 0, "All pages export a default component", `${pageFiles.length} pages`);

  // 6. Route accessibility / RBAC: middleware must guard each portal prefix.
  const mw = readFileSync(join(root, "src/middleware.ts"), "utf8");
  for (const prefix of ["/customer", "/admin", "/vendor"]) {
    r.assert(mw.includes(`"${prefix}"`), `Middleware guards ${prefix}`, "prefix present in RULES");
  }
  r.assert(/matcher\s*:/.test(mw), "Middleware exports a matcher config", "config.matcher present");

  // Security middleware wiring (headers / rate-limit / CSRF) is referenced.
  r.assert(/applySecurityHeaders/.test(mw), "Security headers applied in middleware");
  r.assert(/authLimiter|apiLimiter/.test(mw), "Rate limiting wired in middleware");
  r.assert(/isRequestAllowed/.test(mw), "CSRF check wired in middleware");

  return r.section();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyRoutes().then((s) => process.exit(printSection(s) === "FAIL" ? 1 : 0));
}
