// Master verification runner — `npm run verify`.
//
// Executes every verification section sequentially and writes
// verification-report.md (Build / API / Database / Routes / Auth+Security /
// Workflows). Exits non-zero if any section FAILs, so CI can gate on it.
//
// Re: Playwright — per project policy, E2E is NOT the primary validation
// mechanism. If E2E fails but every section here PASSes, the application is
// considered deployable and the E2E failure is flagged as a test-environment
// issue (see the report's note) unless a section here shows a real defect.

import { writeFileSync } from "node:fs";
import {
  renderSection, tally, overall, type Section, type Status,
} from "./verify/lib";

const ICON: Record<Status, string> = { PASS: "✅", WARNING: "⚠️", FAIL: "❌" };

async function run() {
  const started = new Date();

  // Order matters: build first (generates client / .next), then DB-backed and
  // server-backed checks. Each is isolated so one failure doesn't abort the rest.
  const steps: { fn: () => Promise<Section> }[] = [
    { fn: async () => (await import("./verify-build")).verifyBuild() },
    { fn: async () => (await import("./verify-routes")).verifyRoutes() },
    { fn: async () => (await import("./verify-database")).verifyDatabase() },
    { fn: async () => (await import("./verify-auth")).verifyAuth() },
    { fn: async () => (await import("./verify-rfq")).verifyRfq() },
    { fn: async () => (await import("./verify-api")).verifyApi() },
  ];

  const sections: Section[] = [];
  for (const s of steps) {
    try {
      const section = await s.fn();
      sections.push(section);
      const st = overall(section.checks);
      console.log(`${ICON[st]} ${section.title}: ${st}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      sections.push({ title: "Unknown section", checks: [{ name: "section crashed", status: "FAIL", detail: msg }] });
      console.log(`❌ a verification section crashed: ${msg}`);
    }
  }

  // Aggregate.
  const allChecks = sections.flatMap((s) => s.checks);
  const t = tally(allChecks);
  const status = overall(allChecks);
  const durationS = ((Date.now() - started.getTime()) / 1000).toFixed(1);

  // Map sections → the report's required status categories.
  const byTitle = (name: string) => sections.find((s) => s.title.startsWith(name));
  const cat = (name: string) => {
    const s = byTitle(name);
    return s ? `${ICON[overall(s.checks)]} ${overall(s.checks)}` : "— not run";
  };

  const report = [
    "# DD MediStock — Verification Report",
    "",
    `_Generated: ${started.toISOString()} · duration ${durationS}s_`,
    "",
    `## Overall: ${ICON[status]} ${status}`,
    "",
    `**${t.pass} pass · ${t.warn} warning · ${t.fail} fail** across ${sections.length} sections.`,
    "",
    "| Category | Status |",
    "|----------|--------|",
    `| Build status | ${cat("Build")} |`,
    `| API status | ${cat("API")} |`,
    `| Database status | ${cat("Database")} |`,
    `| Route status | ${cat("Routes")} |`,
    `| Security status | ${cat("Auth")} |`,
    `| Workflow status | ${cat("Workflows")} |`,
    "",
    "## Deployability",
    "",
    status === "FAIL"
      ? "❌ **Not deployable** — one or more verification sections failed. See details below."
      : "✅ **Deployable** — all verification sections pass" + (t.warn ? " (with warnings)." : "."),
    "",
    "> **Playwright E2E policy:** End-to-end browser tests are a secondary signal, not the",
    "> primary gate. If the Playwright `e2e` job fails while every section in this report",
    "> PASSes, treat the app as deployable and the E2E failure as a test-environment issue",
    "> (e.g. browser download, timing, seed/credential drift) — unless a section here shows a",
    "> real application defect.",
    "",
    "## Sections",
    "",
    ...sections.map(renderSection),
  ].join("\n");

  writeFileSync("verification-report.md", report + "\n");
  console.log(`\n${ICON[status]} Overall: ${status} (${t.pass} pass, ${t.warn} warn, ${t.fail} fail) — wrote verification-report.md`);

  process.exit(status === "FAIL" ? 1 : 0);
}

run();
