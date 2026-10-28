// Generate deterministic replay specs from agent runs, replay them without an LLM, and
// regenerate only the ones whose recorded steps no longer work. Expects the storefront to be
// running at STOREFRONT_BASE_URL.
//
//   node scripts/generated-tests.ts generate [--test add-to-cart,find-product]
//   node scripts/generated-tests.ts replay [--regenerate]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type TestKind = "add-to-cart" | "find-product";
type Annotation = { type: string; description?: string };
type ReplayResult = { file: string; status: string; annotations: Annotation[] };
type ResultsFile = {
  suites?: {
    file?: string;
    specs?: { tests?: { results?: { status?: string; annotations?: Annotation[] }[] }[] }[];
  }[];
};

const TESTS: readonly TestKind[] = ["add-to-cart", "find-product"];
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
const testFlag = rest.includes("--test") ? rest[rest.indexOf("--test") + 1] : undefined;
const tests = testFlag ? testFlag.split(",").filter(isTestKind) : TESTS;

if (command === "generate") {
  for (const kind of tests) generate(kind);
} else if (command === "replay") {
  replayAll(rest.includes("--regenerate"));
} else {
  console.error(
    "usage: generated-tests.ts generate [--test add-to-cart,find-product] | replay [--regenerate]",
  );
  process.exitCode = 1;
}

type GenerateResult = "ok" | "agent-did-not-pass" | "script-does-not-replay";

function generate(kind: TestKind): GenerateResult {
  const file = specFile(kind);
  rmSync(file, { force: true });
  console.log(`\n[generate ${kind}] agent run`);
  playwright(["--project=agent", `specs/${kind}.spec.ts`], `generate-${kind}`, {
    STOREFRONT_AGENT_GENERATE: "1",
  });
  if (!existsSync(file)) {
    console.log(`[generate ${kind}] the agent run did not pass, so no script was written`);
    return "agent-did-not-pass";
  }
  const [check] = replay([file], `verify-${kind}`);
  const ok = check?.status === "passed";
  console.log(
    `[generate ${kind}] ${path.relative(packageRoot, file)} ${ok ? "replays cleanly" : `fails on replay: ${describeFailure(check)}`}`,
  );
  return ok ? "ok" : "script-does-not-replay";
}

function replayAll(regenerate: boolean) {
  const files = TESTS.map(specFile).filter((file) => existsSync(file));
  console.log("\n| Script | Replay | Action |");
  console.log("|---|---|---|");
  for (const result of replay(files, "replay")) {
    const name = path.basename(result.file);
    const verdict = confirm(result);
    if (verdict.kind === "passed") {
      console.log(`| ${name} | passed | none |`);
    } else if (verdict.kind === "storefront-fail") {
      console.log(
        `| ${name} | ${verdict.detail} (repeated) | storefront problem, not regenerated |`,
      );
    } else {
      const kind = kindFor(result.file);
      const action =
        regenerate && kind ? REGENERATION_RESULT[generate(kind)] : "regenerate with --regenerate";
      console.log(`| ${name} | stale: ${verdict.detail} | ${action} |`);
    }
  }
}

// A wrong cart after all recorded steps succeeded is only blamed on the storefront if it repeats;
// a one-off failure means the replay itself is unreliable, which is treated as stale.
function confirm(
  result: ReplayResult,
):
  | { kind: "passed" }
  | { kind: "stale"; detail: string }
  | { kind: "storefront-fail"; detail: string } {
  if (result.status === "passed") return { kind: "passed" };
  const stale = result.annotations.find((a) => a.type === "replay-stale");
  if (stale) return { kind: "stale", detail: stale.description ?? "step failed" };
  const [retry] = replay([result.file], `confirm-${path.basename(result.file, ".spec.ts")}`);
  if (retry?.status === "passed") {
    return { kind: "stale", detail: `replay failed once (${describeFailure(result)}) then passed` };
  }
  const retryStale = retry?.annotations.find((a) => a.type === "replay-stale");
  if (retryStale) return { kind: "stale", detail: retryStale.description ?? "step failed" };
  return { kind: "storefront-fail", detail: describeFailure(retry ?? result) };
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

function specFile(kind: TestKind): string {
  return path.join(packageRoot, "generated", `${kind}.spec.ts`);
}

function kindFor(file: string): TestKind | undefined {
  return TESTS.find((kind) => path.basename(file) === `${kind}.spec.ts`);
}

function isTestKind(value: string): value is TestKind {
  return TESTS.some((kind) => kind === value);
}
