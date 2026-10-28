// Builds a static HTML "journey" view of agent runs: outcome, verdict, and a filmstrip of every
// screenshot the model saw with its click marked, plus any generated replay script.
//
//   node scripts/journey-report.ts [dir ...]   (default: test-results and matrix-runs)
//   open journey-report/index.html
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { estimateCostUsd } from "../src/cost.ts";

type Attachment = { name: string; body?: string; path?: string; contentType?: string };
type TestResult = { attachments?: Attachment[]; startTime?: string };
type ResultsFile = {
  suites?: { title?: string; specs?: { title?: string; tests?: { results?: TestResult[] }[] }[] }[];
};
type Step = {
  action: string;
  args: Record<string, unknown>;
  ok: boolean;
  error?: string;
  screenshotIndex?: number;
};
type Click = {
  role: string | null;
  name: string;
  text: string;
  scope: { kind: string; name?: string; role?: string };
  x: number;
  y: number;
  url: string;
};
type Run = {
  outcome: string;
  claim: string;
  reason: string;
  start: string;
  model: string;
  goal: string;
  stepCount: number;
  durationMs: number;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens?: number } | null;
  navigations: string[];
  shortcuts?: string[];
  state: { kind: string; reason?: string; lines?: { quantity: number; label: string }[] };
  clicks?: Click[] | null;
  thoughts?: string[];
  steps: Step[];
};

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(packageRoot, "journey-report");
const imgDir = path.join(outDir, "img");
const VIEWPORT = { width: 1280, height: 800 };
const THUMB_WIDTH = 480;

const inputs = process.argv.slice(2);
const roots =
  inputs.length > 0
    ? inputs.map((dir) => path.resolve(dir))
    : [path.join(packageRoot, "test-results"), path.join(packageRoot, "matrix-runs")];

function findResults(root: string): string[] {
  if (!existsSync(root)) return [];
  if (statSync(root).isFile()) return root.endsWith("playwright-results.json") ? [root] : [];
  return readdirSync(root).flatMap((entry) => {
    if (entry === "node_modules" || entry === "journey-report") return [];
    return findResults(path.join(root, entry));
  });
}

function allResults(report: ResultsFile): TestResult[] {
  return (report.suites ?? []).flatMap((suite) =>
    (suite.specs ?? []).flatMap((spec) => (spec.tests ?? []).flatMap((test) => test.results ?? [])),
  );
}

function readAttachment(attachment: Attachment, resultsFile: string): Buffer | null {
  if (attachment.body) return Buffer.from(attachment.body, "base64");
  if (attachment.path) {
    const resolved = path.isAbsolute(attachment.path)
      ? attachment.path
      : path.resolve(path.dirname(resultsFile), attachment.path);
    return existsSync(resolved) ? readFileSync(resolved) : null;
  }
  return null;
}

function writeScreenshots(attachments: Attachment[], resultsFile: string, run: number): string[] {
  return attachments
    .filter((a) => a.name.startsWith("agent-screenshot-"))
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .flatMap((attachment, i) => {
      const name = `run${run}-${String(i + 1).padStart(2, "0")}.png`;
      if (attachment.path && !attachment.body && existsSync(attachment.path)) {
        copyFileSync(attachment.path, path.join(imgDir, name));
        return [`img/${name}`];
      }
      const data = readAttachment(attachment, resultsFile);
      if (!data) return [];
      writeFileSync(path.join(imgDir, name), data);
      return [`img/${name}`];
    });
}

function runCost(run: Run): number | null {
  const usage = run.usage
    ? { ...run.usage, cachedInputTokens: run.usage.cachedInputTokens ?? 0 }
    : null;
  return estimateCostUsd(run.model, usage)?.usd ?? null;
}

function dollars(usd: number | null): string {
  return usd === null ? "–" : "$" + usd.toFixed(2);
}

function indexRow(id: string, run: Run, source: string, startTime: string | undefined): string {
  const tokens = run.usage ? `${Math.round(run.usage.inputTokens / 1000)}k` : "–";
  return `<tr><td><a href="#${id}">${esc(id)}</a></td><td>${badge(run.outcome)}</td><td>${esc(source)}</td><td>${esc(run.start)}</td><td>${run.stepCount}</td><td>${Math.round(run.durationMs / 1000)}s</td><td>${tokens}</td><td>${dollars(runCost(run))}</td><td>${esc(startTime ? new Date(startTime).toLocaleString() : "")}</td></tr>`;
}

function runSection(
  id: string,
  run: Run,
  source: string,
  screenshots: string[],
  generated: string | undefined,
): string {
  const clickSteps = new Map<number, Click>();
  // Pair click steps with recorded click targets by coordinates, as codegen does.
  let cursor = 0;
  run.steps.forEach((step, i) => {
    if (!["click", "doubleClick", "tripleClick"].includes(step.action) || !run.clicks) return;
    for (let j = cursor; j < run.clicks.length; j++) {
      const click = run.clicks[j];
      if (
        click &&
        Math.abs(click.x - Number(step.args.x)) <= 6 &&
        Math.abs(click.y - Number(step.args.y)) <= 6
      ) {
        clickSteps.set(i, click);
        cursor = j + 1;
        return;
      }
    }
  });

  const cards = run.steps
    .map((step, i) => stepCard(step, i, screenshots, clickSteps.get(i)))
    .join("\n");
  const cart = run.state.lines?.length
    ? run.state.lines.map((l) => `${l.quantity} × ${esc(l.label)}`).join("<br>")
    : esc(run.state.kind);
  const navs = run.navigations.map((u) => `<li>${esc(shortUrl(u))}</li>`).join("");
  const shortcuts = run.shortcuts?.length
    ? `<p class="warn">Shortcuts: ${esc(run.shortcuts.join("; "))}</p>`
    : "";
  return `<section id="${id}">
  <h2>${esc(id)} ${badge(run.outcome)} <small>${esc(source)} · start: ${esc(run.start)} · ${esc(run.model)}</small></h2>
  <div class="meta">
    <div><h3>Goal</h3><p>${esc(run.goal)}</p></div>
    <div><h3>Agent claim</h3><p><b>${esc(run.claim)}</b>: ${esc(run.reason)}</p></div>
    <div><h3>Cart (verifier)</h3><p>${cart}${run.state.reason ? `<br><span class="muted">${esc(run.state.reason)}</span>` : ""}</p></div>
    <div><h3>Cost</h3><p>${run.stepCount} steps · ${Math.round(run.durationMs / 1000)}s · ${run.usage ? `${Math.round(run.usage.inputTokens / 1000)}k in / ${Math.round(run.usage.outputTokens / 1000)}k out tokens · ${dollars(runCost(run))}` : "no usage"}</p></div>
  </div>
  ${shortcuts}
  <details><summary>Navigation path (${run.navigations.length})</summary><ol class="navs">${navs}</ol></details>
  ${thoughtsHtml(run.thoughts)}
  ${generated ? `<details><summary>Generated replay script</summary><pre>${esc(generated)}</pre></details>` : ""}
  <div class="strip">${cards}</div>
</section>`;
}

function thoughtsHtml(thoughts: string[] | undefined): string {
  if (!thoughts?.length) return "";
  const items = thoughts.map((t) => `<li>${esc(t)}</li>`).join("");
  return `<details open><summary>Model reasoning (${thoughts.length})</summary><ol class="thoughts">${items}</ol></details>`;
}

function stepCard(step: Step, i: number, screenshots: string[], click: Click | undefined): string {
  const shot = screenshots[step.screenshotIndex ?? i];
  const errorLine = step.error ? `<br><span class="warn">${esc(step.error)}</span>` : "";
  const pageLine = `<span class="muted">${esc(shortUrl(String(step.args.pageUrl ?? "")))}</span>`;
  return `<figure class="${step.ok ? "" : "failed"}">${shotHtml(shot, clickPoint(step))}<figcaption><b>${i + 1}.</b> ${esc(describeStep(step, click))}<br>${pageLine}${errorLine}</figcaption></figure>`;
}

function clickPoint(step: Step): { x: number; y: number } | null {
  if (step.action === "custom_tool") return null;
  const x = Number(step.args.x);
  const y = Number(step.args.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function shotHtml(shot: string | undefined, point: { x: number; y: number } | null): string {
  if (!shot) return `<div class="shot empty">no screenshot</div>`;
  const scale = THUMB_WIDTH / VIEWPORT.width;
  const marker = point
    ? `<span class="marker" style="left:${point.x * scale}px;top:${point.y * scale}px"></span>`
    : "";
  return `<a href="${shot}" target="_blank" class="shot"><img src="${shot}" loading="lazy" width="${THUMB_WIDTH}">${marker}</a>`;
}

const STEP_DESCRIPTIONS: Record<string, (step: Step) => string> = {
  custom_tool: (step) => {
    const input = step.args.input;
    return `finish ${typeof input === "object" && input ? JSON.stringify(input) : ""}`;
  },
  type: (step) => `type "${String(step.args.text ?? "")}"`,
  keypress: (step) => `press ${JSON.stringify(step.args.keys ?? step.args.text)}`,
  scroll: (step) =>
    `scroll ${String(step.args.scroll_direction ?? "")} ${String(step.args.scroll_amount ?? "")}`,
};

function describeStep(step: Step, click: Click | undefined): string {
  const describe = STEP_DESCRIPTIONS[step.action];
  if (describe) return describe(step);
  if (click) return `${step.action} ${describeClick(click)}`;
  const point = clickPoint(step);
  return point ? `${step.action} at ${point.x},${point.y}` : step.action;
}

function describeClick(click: Click): string {
  const what = `${click.role ?? "element"} "${click.name || click.text}"`;
  if (click.scope.kind === "dialog") return `${what} in dialog "${click.scope.name ?? ""}"`;
  if (click.scope.kind === "landmark") return `${what} in ${click.scope.role ?? ""}`;
  return what;
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host.startsWith("localhost") ? "" : parsed.host}${parsed.pathname}${parsed.search.replace(/key=[^&]+/, "key=…")}`;
  } catch {
    return url;
  }
}

function badge(outcome: string): string {
  return `<span class="badge ${esc(outcome.toLowerCase())}">${esc(outcome)}</span>`;
}

function esc(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function page(rows: string[], body: string[], totalRow: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Agent journeys</title><style>
  body{font:14px/1.45 system-ui,sans-serif;margin:24px;color:#1b1b1b;background:#fafafa}
  h1{margin:0 0 12px} h2{margin:32px 0 8px;border-top:1px solid #ddd;padding-top:16px} h2 small{font-weight:400;color:#666;font-size:13px}
  h3{margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#666}
  table{border-collapse:collapse;background:#fff} td,th{border:1px solid #e3e3e3;padding:4px 8px;text-align:left}
  .badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600;color:#fff;background:#888}
  .pass{background:#1a7f37}.fail{background:#cf222e}.blocked{background:#9a6700}.inconclusive{background:#57606a}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:#fff;padding:12px;border:1px solid #e3e3e3}
  .meta p{margin:0}.muted{color:#777}.warn{color:#cf222e}
  .strip{display:flex;gap:12px;overflow-x:auto;padding:12px 0}
  figure{margin:0;flex:0 0 ${THUMB_WIDTH}px;background:#fff;border:1px solid #e3e3e3}
  figure.failed{border-color:#cf222e}
  .shot{position:relative;display:block;line-height:0}.shot img{display:block;border-bottom:1px solid #eee}
  .shot.empty{height:${(THUMB_WIDTH * VIEWPORT.height) / VIEWPORT.width}px;display:flex;align-items:center;justify-content:center;color:#999;line-height:1.4}
  .marker{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border:3px solid #ff2d55;border-radius:50%;box-shadow:0 0 0 3px rgba(255,45,85,.3)}
  figcaption{padding:8px;font-size:13px} pre{background:#fff;border:1px solid #e3e3e3;padding:12px;overflow-x:auto;font-size:12px}
  .navs{margin:4px 0;font-size:12px}
  .thoughts{margin:4px 0;font-size:13px;max-height:260px;overflow-y:auto;background:#fff;border:1px solid #e3e3e3;padding:8px 8px 8px 32px}
  </style></head><body>
  <h1>Agent journeys</h1>
  <table><tr><th>Run</th><th>Outcome</th><th>Source</th><th>Start</th><th>Steps</th><th>Time</th><th>Input tokens</th><th>Cost</th><th>When</th></tr>${rows.join("")}${totalRow}</table>
  ${body.join("\n")}
  </body></html>`;
}

function main() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(imgDir, { recursive: true });

  const sections: string[] = [];
  const index: string[] = [];
  let runNumber = 0;
  const costs: number[] = [];
  for (const file of roots.flatMap((root) => findResults(root))) {
    const report: ResultsFile = JSON.parse(readFileSync(file, "utf8"));
    const source = path.dirname(file).split(path.sep).slice(-2).join("/");
    for (const result of allResults(report)) {
      const runAttachment = result.attachments?.find((a) => a.name === "run.json");
      const runText = runAttachment ? readAttachment(runAttachment, file) : null;
      if (!runText) continue;
      runNumber += 1;
      const run: Run = JSON.parse(runText.toString("utf8"));
      const screenshots = writeScreenshots(result.attachments ?? [], file, runNumber);
      const generated = result.attachments?.find((a) => a.name === "generated.spec.ts");
      const generatedText = generated
        ? readAttachment(generated, file)?.toString("utf8")
        : undefined;
      const id = `run-${runNumber}`;
      const cost = runCost(run);
      if (cost !== null) costs.push(cost);
      index.push(indexRow(id, run, source, result.startTime));
      sections.push(runSection(id, run, source, screenshots, generatedText));
    }
  }

  const total = costs.reduce((sum, usd) => sum + usd, 0);
  const totalRow = `<tr><td colspan="7"><b>Total (${costs.length} priced runs)</b></td><td><b>${dollars(total)}</b></td><td></td></tr>`;
  writeFileSync(path.join(outDir, "index.html"), page(index, sections, totalRow));
  console.log(
    `Wrote ${runNumber} runs to ${path.relative(process.cwd(), path.join(outDir, "index.html"))}`,
  );
}

main();
