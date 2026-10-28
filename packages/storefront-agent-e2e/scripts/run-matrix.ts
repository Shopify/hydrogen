// Runs the spike calibration matrix against the React Router template on this branch.
// For each server configuration: start the template with its SPIKE_* switches, run the scripted
// DOM-contract flow once, run the agent rows, and append every run to matrix-runs/<id>/results.jsonl.
//
//   node scripts/run-matrix.ts [--rows H1,B1] [--trials 1]
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ServerConfig = { readonly fault?: string; readonly ux?: string };
type Row = {
  readonly id: string;
  readonly label: string;
  readonly server: ServerConfig;
  readonly start: "home" | "product";
  readonly trials: number;
  readonly healthy: boolean;
};
type TestResult = {
  status?: string;
  error?: { message?: string };
  attachments?: { name: string; body?: string }[];
};
type ResultsFile = { suites?: { specs?: { tests?: { results?: TestResult[] }[] }[] }[] };

const ROWS: readonly Row[] = [
  { id: "H1", label: "drawer", server: {}, start: "home", trials: 10, healthy: true },
  { id: "H2", label: "drawer", server: {}, start: "product", trials: 10, healthy: true },
  {
    id: "H3",
    label: "cart page only",
    server: { ux: "cart-page" },
    start: "home",
    trials: 5,
    healthy: true,
  },
  {
    id: "H4",
    label: "newsletter modal",
    server: { ux: "newsletter-modal" },
    start: "home",
    trials: 5,
    healthy: true,
  },
  {
    id: "B1",
    label: "wrong-variant",
    server: { fault: "wrong-variant" },
    start: "home",
    trials: 5,
    healthy: false,
  },
  {
    id: "B2",
    label: "wrong-variant",
    server: { fault: "wrong-variant" },
    start: "product",
    trials: 5,
    healthy: false,
  },
  {
    id: "B3",
    label: "quantity-ignored",
    server: { fault: "quantity-ignored" },
    start: "home",
    trials: 5,
    healthy: false,
  },
  {
    id: "B4",
    label: "quantity-ignored",
    server: { fault: "quantity-ignored" },
    start: "product",
    trials: 5,
    healthy: false,
  },
];

const PORT = Number(process.env.STOREFRONT_MATRIX_PORT ?? "4201");
// Children inherit this, so every batch points at the server this runner manages.
process.env.STOREFRONT_BASE_URL = `http://localhost:${PORT}/`;
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");

const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const onlyRows = flag("rows")?.split(",");
const trialsFlag = flag("trials");
const trialsOverride = trialsFlag ? Number(trialsFlag) : undefined;
// --rebuild <dir> recomputes results.jsonl from the per-row Playwright reports already saved there.
const rebuildDir = flag("rebuild");
const runDir = rebuildDir
  ? path.resolve(rebuildDir)
  : path.join(packageRoot, "matrix-runs", new Date().toISOString().replaceAll(/[:.]/g, "-"));
mkdirSync(runDir, { recursive: true });
const resultsFile = path.join(runDir, "results.jsonl");

if (rebuildDir) {
  rebuild();
} else {
  const groups = new Map<string, Row[]>();
  for (const row of ROWS.filter((r) => !onlyRows || onlyRows.includes(r.id))) {
    const key = `${row.server.fault ?? ""}|${row.server.ux ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const groupRows of groups.values()) await runGroup(groupRows);
}

console.log(`\nResults: ${path.relative(process.cwd(), resultsFile)}`);
console.log(`Summary: node scripts/summarize-matrix.ts ${path.relative(packageRoot, runDir)}`);

async function runGroup(groupRows: Row[]) {
  const server = groupRows[0]?.server ?? {};
  console.log(`\n=== server fault=${server.fault ?? "none"} ux=${server.ux ?? "default"}`);
  const child = await startServer(server);
  try {
    record({ kind: "script", server, ...runScripted(server) });
    for (const row of groupRows) runRow(row);
  } finally {
    stopServer(child);
  }
}

function runRow(row: Row) {
  const trials = trialsOverride ?? row.trials;
  console.log(`--- ${row.id} ${row.label} from ${row.start} x${trials}`);
  const out = path.join(runDir, row.id);
  spawnSync(
    "pnpm",
    ["exec", "playwright", "test", "specs/stage1-agent.spec.ts", "--repeat-each", String(trials)],
    {
      cwd: packageRoot,
      env: { ...process.env, STOREFRONT_AGENT_START: row.start, STOREFRONT_AGENT_OUT: out },
      stdio: "inherit",
    },
  );
  recordRow(row, out, trials);
}

function rebuild() {
  const scriptLines = existsSync(resultsFile)
    ? readFileSync(resultsFile, "utf8")
        .split("\n")
        .filter((line) => line.includes('"kind":"script"'))
    : [];
  writeFileSync(resultsFile, scriptLines.map((line) => `${line}\n`).join(""));
  for (const row of ROWS) {
    const out = path.join(runDir, row.id);
    if (existsSync(path.join(out, "playwright-results.json"))) recordRow(row, out);
  }
}

function recordRow(row: Row, out: string, expectedTrials?: number) {
  const results = allTests(out).flatMap((test) => test.results ?? []);
  if (expectedTrials !== undefined && results.length !== expectedTrials) {
    console.log(`    warning: ${row.id} recorded ${results.length} of ${expectedTrials} trials`);
  }
  results.forEach((result, trial) => {
    const base = {
      kind: "agent",
      row: row.id,
      label: row.label,
      start: row.start,
      healthy: row.healthy,
      trial,
    };
    record({ ...base, ...summarizeResult(result) });
  });
}

function summarizeResult(result: TestResult): Record<string, unknown> {
  const body = result.attachments?.find((a) => a.name === "run.json")?.body;
  if (!body) return { harnessError: String(result.error?.message ?? result.status).slice(0, 300) };
  const { steps, ...summary } = JSON.parse(Buffer.from(body, "base64").toString());
  return { ...summary, actions: Array.isArray(steps) ? steps.map((s) => s.action) : [] };
}

function runScripted(server: ServerConfig): { scriptPassed: boolean; detail: string } {
  const out = path.join(runDir, `script-${server.fault ?? "none"}-${server.ux ?? "default"}`);
  const result = spawnSync(
    "pnpm",
    ["exec", "playwright", "test", "specs/stage0-verifier.spec.ts", "--grep", "checkout link"],
    {
      cwd: packageRoot,
      env: { ...process.env, SPIKE_FAULT: server.fault ?? "", STOREFRONT_AGENT_OUT: out },
      encoding: "utf8",
    },
  );
  const passed = result.status === 0;
  const detail = passed ? "" : firstErrorLine(out);
  console.log(
    `    scripted DOM-contract flow: ${passed ? "passed" : `failed (${detail.slice(0, 120)})`}`,
  );
  return { scriptPassed: passed, detail };
}

function firstErrorLine(out: string): string {
  const message = allTests(out)[0]?.results?.[0]?.error?.message ?? "";
  return message.split("\n")[0] ?? "";
}

function allTests(out: string): { results?: TestResult[] }[] {
  const file = path.join(out, "playwright-results.json");
  if (!existsSync(file)) return [];
  const report: ResultsFile = JSON.parse(readFileSync(file, "utf8"));
  // --repeat-each lists each repeat as its own spec entry.
  return (report.suites ?? []).flatMap((suite) =>
    (suite.specs ?? []).flatMap((spec) => spec.tests ?? []),
  );
}

function record(entry: Record<string, unknown>) {
  appendFileSync(resultsFile, `${JSON.stringify(entry)}\n`);
}

const READY_TIMEOUT_MS = 90_000;
const PORT_FREE_TIMEOUT_MS = 30_000;
let activeServer: ChildProcess | null = null;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (activeServer) stopServer(activeServer);
    process.exit(130);
  });
}

async function startServer(server: ServerConfig): Promise<ChildProcess> {
  await waitForPortFree();
  const child = spawn(
    "pnpm",
    [
      "--filter",
      "@shopify/hydrogen-template-react-router",
      "exec",
      "vite",
      "dev",
      "--port",
      String(PORT),
      "--strictPort",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, SPIKE_FAULT: server.fault ?? "", SPIKE_UX: server.ux ?? "" },
      stdio: "ignore",
      // Own process group, so stopping it also stops vite and workerd grandchildren.
      detached: true,
    },
  );
  activeServer = child;
  const expected = `fault=${server.fault ?? ""};ux=${server.ux ?? ""}`;
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Template dev server exited (${child.exitCode})`);
    const config = await fetch(`http://localhost:${PORT}/`, {
      signal: AbortSignal.timeout(5_000),
    }).then(
      (r) => (r.ok ? r.headers.get("x-spike-config") : null),
      () => null,
    );
    if (config === expected) return child;
    if (config !== null) {
      stopServer(child);
      throw new Error(`Port ${PORT} answers with ${config}, expected ${expected}: a stale server?`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  stopServer(child);
  throw new Error("Template dev server did not become ready");
}

function stopServer(child: ChildProcess) {
  if (child.pid !== undefined && child.exitCode === null) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  if (activeServer === child) activeServer = null;
}

async function waitForPortFree() {
  const deadline = Date.now() + PORT_FREE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const listing = spawnSync("lsof", ["-ti", `tcp:${PORT}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    if (listing.stdout.trim() === "") return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Port ${PORT} is still in use; stop whatever is listening before running the matrix`,
  );
}
