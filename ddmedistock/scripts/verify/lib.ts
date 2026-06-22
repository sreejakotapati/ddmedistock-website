// Shared verification harness.
//
// Each verify-*.ts script builds a Section of Checks with status PASS / WARNING
// / FAIL and a diagnostic message. Scripts are runnable standalone (printing a
// section) and importable by scripts/verify.ts (the `npm run verify` master),
// which aggregates every section into verification-report.md.
//
// This is verification tooling only — it never modifies business logic. The
// workflow checks create clearly-tagged temporary rows and delete them again.

export type Status = "PASS" | "WARNING" | "FAIL";

export type Check = {
  name: string;
  status: Status;
  detail: string;
};

export type Section = {
  title: string;
  checks: Check[];
};

export class Reporter {
  readonly checks: Check[] = [];
  constructor(public readonly title: string) {}

  pass(name: string, detail = "") {
    this.checks.push({ name, status: "PASS", detail });
  }
  warn(name: string, detail = "") {
    this.checks.push({ name, status: "WARNING", detail });
  }
  fail(name: string, detail = "") {
    this.checks.push({ name, status: "FAIL", detail });
  }

  /** Record PASS when `ok`, else FAIL (or WARNING when `soft`). */
  assert(ok: boolean, name: string, detail = "", soft = false) {
    if (ok) this.pass(name, detail);
    else if (soft) this.warn(name, detail);
    else this.fail(name, detail);
  }

  /** Run a probe, capturing thrown errors as a FAIL instead of crashing. */
  async check(name: string, fn: () => Promise<string | void> | string | void, soft = false) {
    try {
      const detail = (await fn()) || "";
      this.pass(name, detail);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (soft) this.warn(name, msg);
      else this.fail(name, msg);
    }
  }

  section(): Section {
    return { title: this.title, checks: this.checks };
  }
}

const ICON: Record<Status, string> = { PASS: "✅", WARNING: "⚠️", FAIL: "❌" };

export function tally(checks: Check[]) {
  return {
    pass: checks.filter((c) => c.status === "PASS").length,
    warn: checks.filter((c) => c.status === "WARNING").length,
    fail: checks.filter((c) => c.status === "FAIL").length,
  };
}

/** Worst status across a set of checks (FAIL > WARNING > PASS). */
export function overall(checks: Check[]): Status {
  if (checks.some((c) => c.status === "FAIL")) return "FAIL";
  if (checks.some((c) => c.status === "WARNING")) return "WARNING";
  return "PASS";
}

/** Print a section to stdout (standalone runs). */
export function printSection(s: Section): Status {
  const t = tally(s.checks);
  console.log(`\n=== ${s.title} ===`);
  for (const c of s.checks) {
    console.log(`${ICON[c.status]} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  const status = overall(s.checks);
  console.log(`--- ${s.title}: ${ICON[status]} ${status} (${t.pass} pass, ${t.warn} warn, ${t.fail} fail)`);
  return status;
}

/** Render a section as a Markdown block for the aggregate report. */
export function renderSection(s: Section): string {
  const t = tally(s.checks);
  const status = overall(s.checks);
  const lines = [
    `### ${ICON[status]} ${s.title} — ${status}`,
    "",
    `${t.pass} pass · ${t.warn} warning · ${t.fail} fail`,
    "",
    "| Check | Status | Detail |",
    "|-------|--------|--------|",
    ...s.checks.map((c) => `| ${c.name} | ${ICON[c.status]} ${c.status} | ${c.detail.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`),
    "",
  ];
  return lines.join("\n");
}

/** Run a shell command, returning {code, out}. Never throws. */
export async function sh(cmd: string, timeoutMs = 600_000): Promise<{ code: number; out: string }> {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", cmd], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, out });
    });
  });
}
