// Summarizes a matrix run against the spike's pre-registered thresholds.
//   node scripts/summarize-matrix.ts matrix-runs/<id>
import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import { estimateCostUsd } from "../src/cost.ts";

const agentEntrySchema = z.object({
  kind: z.literal("agent"),
  row: z.string(),
  label: z.string(),
  test: z.string(),
  healthy: z.boolean(),
  outcome: z.string().optional(),
  stepCount: z.number().optional(),
  durationMs: z.number().optional(),
  model: z.string().optional(),
  usage: z
    .object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      cachedInputTokens: z.number().optional(),
    })
    .nullable()
    .optional(),
  reason: z.string().optional(),
  harnessError: z.string().optional(),
  friction: z.array(z.string()).optional(),
});
const scriptEntrySchema = z.object({
  kind: z.literal("script"),
  server: z.object({ fault: z.string().optional(), ux: z.string().optional() }),
  scriptPassed: z.boolean(),
});
const entrySchema = z.discriminatedUnion("kind", [agentEntrySchema, scriptEntrySchema]);
type AgentEntry = z.infer<typeof agentEntrySchema>;
type ScriptEntry = z.infer<typeof scriptEntrySchema>;

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/summarize-matrix.ts matrix-runs/<id>");
const entries = readFileSync(path.join(dir, "results.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => entrySchema.parse(JSON.parse(line)));
const agent = entries.filter((e): e is AgentEntry => e.kind === "agent");
const scripts = entries.filter((e): e is ScriptEntry => e.kind === "script");
const outcomeOf = (e: AgentEntry) => e.outcome ?? "HARNESS-ERROR";
const costOf = (e: AgentEntry) =>
  e.usage && e.model
    ? (estimateCostUsd(e.model, { ...e.usage, cachedInputTokens: e.usage.cachedInputTokens ?? 0 })
        ?.usd ?? Number.NaN)
    : Number.NaN;

printRowTable();
printThresholds();
printScripts();
printTriage();

function median(values: number[]): number {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (sorted.length === 0) return Number.NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] ?? Number.NaN)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

// Wilson score interval, 95%.
function wilson(successes: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z95 = 1.96;
  const p = successes / n;
  const denom = 1 + (z95 * z95) / n;
  const centre = (p + (z95 * z95) / (2 * n)) / denom;
  const half = (z95 * Math.sqrt((p * (1 - p)) / n + (z95 * z95) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

function printRowTable() {
  console.log(
    "| Row | Storefront | Test | Runs | PASS | (friction) | FAIL | BLOCKED | INCONCL. | Median steps | Median time | Median input tokens | Median cost |",
  );
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const row of new Set(agent.map((e) => e.row))) {
    const runs = agent.filter((e) => e.row === row);
    const count = (o: string) => runs.filter((e) => outcomeOf(e) === o).length;
    const steps = median(runs.map((e) => e.stepCount ?? Number.NaN));
    const seconds = Math.round(median(runs.map((e) => e.durationMs ?? Number.NaN)) / 1000);
    const tokens = Math.round(median(runs.map((e) => e.usage?.inputTokens ?? Number.NaN)) / 1000);
    const inconclusive = count("INCONCLUSIVE") + count("HARNESS-ERROR");
    const withFriction = runs.filter(
      (e) => outcomeOf(e) === "PASS" && (e.friction?.length ?? 0) > 0,
    ).length;
    const cost = median(runs.map(costOf));
    console.log(
      `| ${row} | ${runs[0]?.label} | ${runs[0]?.test} | ${runs.length} | ${count("PASS")} | ${withFriction} | ${count("FAIL")} | ${count("BLOCKED")} | ${inconclusive} | ${steps} | ${seconds}s | ${tokens}k | ${Number.isFinite(cost) ? "$" + cost.toFixed(2) : "–"} |`,
    );
  }
}

function printThresholds() {
  const healthy = agent.filter((e) => e.healthy);
  const broken = agent.filter((e) => !e.healthy);
  const falseFail = healthy.filter((e) => outcomeOf(e) === "FAIL").length;
  const notPass = healthy.filter((e) =>
    ["BLOCKED", "INCONCLUSIVE", "HARNESS-ERROR"].includes(outcomeOf(e)),
  ).length;
  const caught = broken.filter((e) => ["FAIL", "BLOCKED"].includes(outcomeOf(e))).length;

  console.log("\n| Threshold | Observed | 95% CI | Met? |");
  console.log("|---|---|---|---|");
  const line = (label: string, hits: number, n: number, met: boolean) => {
    const [low, high] = wilson(hits, n);
    console.log(
      `| ${label} | ${hits}/${n} (${pct(hits / n)}) | ${pct(low)}–${pct(high)} | ${met ? "yes" : "no"} |`,
    );
  };
  line("Healthy false FAIL ≤ 2%", falseFail, healthy.length, falseFail / healthy.length <= 0.02);
  line(
    "Healthy BLOCKED + INCONCLUSIVE ≤ 10%",
    notPass,
    healthy.length,
    notPass / healthy.length <= 0.1,
  );
  line("Broken FAIL + BLOCKED ≥ 95%", caught, broken.length, caught / broken.length >= 0.95);

  const totalCost = agent
    .map(costOf)
    .filter(Number.isFinite)
    .reduce((sum, usd) => sum + usd, 0);
  const inputTokens = agent.reduce((sum, e) => sum + (e.usage?.inputTokens ?? 0), 0);
  console.log(
    `\nTotal input tokens: ${Math.round(inputTokens / 1000)}k across ${agent.length} runs; estimated cost ` +
      "$" +
      totalCost.toFixed(2),
  );
}

function printScripts() {
  console.log("\nScripted flows (add to cart via checkout link, product page check) per server:");
  for (const s of scripts) {
    const server = `fault=${s.server.fault ?? "none"} ux=${s.server.ux ?? "default"}`;
    console.log(`- ${server}: ${s.scriptPassed ? "passed" : "failed"}`);
  }
}

function printTriage() {
  const surprises = agent.filter(
    (e) => (e.healthy && outcomeOf(e) !== "PASS") || (!e.healthy && outcomeOf(e) === "PASS"),
  );
  if (surprises.length === 0) return;
  console.log("\nRuns to triage:");
  for (const e of surprises) {
    console.log(`- ${e.row} ${outcomeOf(e)}: ${(e.reason ?? e.harnessError ?? "").slice(0, 200)}`);
  }
}
