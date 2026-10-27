// Generate deterministic replay specs from agent runs, replay them without an LLM, and
// regenerate only the ones whose recorded steps no longer work. Expects the storefront to be
// running at STOREFRONT_BASE_URL.
//
//   node scripts/generated-tests.ts generate [--start home,product]
//   node scripts/generated-tests.ts replay [--regenerate]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Start = "home" | "product";
type Annotation = { type: string; description?: string };
type ReplayResult = { file: string; status: string; annotations: Annotation[] };
type ResultsFile = {
  suites?: {
    file?: string;
    specs?: { tests?: { results?: { status?: string; annotations?: Annotation[] }[] }[] }[];
  }[];
};

const STARTS: readonly Start[] = ["home", "product"];
const REGENERATION_RESULT: Record<"ok" | "agent-did-not-pass" | "script-does-not-replay", string> =
  {
    ok: "regenerated: healed",
    "agent-did-not-pass": "agent could not complete the task: likely a storefront problem",
    "script-does-not-replay":
      "agent passed, but the generated script does not replay: generator gap",
  };
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const outRoot = path.join(packageRoot, "test-results", "generated-tests");

const [command, ...rest] = process.argv.slice(2);
const startFlag = rest.includes("--start") ? rest[rest.indexOf("--start") + 1] : undefined;
const starts = startFlag ? startFlag.split(",").filter(isStart) : STARTS;

if (command === "generate") {
  for (const start of starts) generate(start);
} else if (command === "replay") {
  replayAll(rest.includes("--regenerate"));
} else {
  console.error(
    "usage: generated-tests.ts generate [--start home,product] | replay [--regenerate]",
  );
  process.exitCode = 1;
}

type GenerateResult = "ok" | "agent-did-not-pass" | "script-does-not-replay";

function generate(start: Start): GenerateResult {
  const file = specFile(start);
  rmSync(file, { force: true });
  console.log(`\n[generate ${start}] agent run`);
  playwright(["--project=agent", "specs/stage1-agent.spec.ts"], `generate-${start}`, {
    STOREFRONT_AGENT_START: start,
    STOREFRONT_AGENT_GENERATE: "1",
  });
  if (!existsSync(file)) {
    console.log(`[generate ${start}] the agent run did not pass, so no script was written`);
    return "agent-did-not-pass";
  }
  const [check] = replay([file], `verify-${start}`);
  const ok = check?.status === "passed";
  console.log(
    `[generate ${start}] ${path.relative(packageRoot, file)} ${ok ? "replays cleanly" : `fails on replay: ${describeFailure(check)}`}`,
  );
  return ok ? "ok" : "script-does-not-replay";
}

function replayAll(regenerate: boolean) {
  const files = STARTS.map(specFile).filter((file) => existsSync(file));
  const results = replay(files, "replay");
  console.log("\n| Script | Replay | Action |");
  console.log("|---|---|---|");
  for (const result of results) {
    const name = path.basename(result.file);
    if (result.status === "passed") {
      console.log(`| ${name} | passed | none |`);
      continue;
    }
    const stale = result.annotations.find((a) => a.type === "replay-stale");
    if (!stale) {
      console.log(`| ${name} | ${describeFailure(result)} | storefront problem, not regenerated |`);
      continue;
    }
    const start = startFor(result.file);
    if (!regenerate || !start) {
      console.log(`| ${name} | stale: ${stale.description} | regenerate with --regenerate |`);
      continue;
    }
    const outcome = generate(start);
    console.log(`| ${name} | stale: ${stale.description} | ${REGENERATION_RESULT[outcome]} |`);
  }
}

function replay(files: string[], label: string): ReplayResult[] {
  if (files.length === 0) return [];
  const out = playwright(["--project=replay", ...files], label, {});
  const report: ResultsFile = existsSync(path.join(out, "playwright-results.json"))
    ? JSON.parse(readFileSync(path.join(out, "playwright-results.json"), "utf8"))
    : {};
  return (report.suites ?? []).flatMap((suite) =>
    (suite.specs ?? []).flatMap((spec) =>
      (spec.tests ?? []).flatMap((test) =>
        (test.results ?? []).map((result) => ({
          file: path.join(packageRoot, "generated", path.basename(suite.file ?? "")),
          status: result.status ?? "unknown",
          annotations: result.annotations ?? [],
        })),
      ),
    ),
  );
}

function playwright(args: string[], label: string, env: Record<string, string>): string {
  const out = path.join(outRoot, label);
  spawnSync("pnpm", ["exec", "playwright", "test", ...args], {
    cwd: packageRoot,
    env: { ...process.env, ...env, STOREFRONT_AGENT_OUT: out },
    stdio: "inherit",
  });
  return out;
}

function describeFailure(result: ReplayResult | undefined): string {
  if (!result) return "no result";
  const note = result.annotations.find(
    (a) => a.type === "replay-stale" || a.type === "replay-verdict",
  );
  return note?.description ?? result.status;
}

function specFile(start: Start): string {
  return path.join(packageRoot, "generated", `add-to-cart-${start}.spec.ts`);
}

function startFor(file: string): Start | undefined {
  return STARTS.find((start) => path.basename(file) === `add-to-cart-${start}.spec.ts`);
}

function isStart(value: string): value is Start {
  return value === "home" || value === "product";
}
