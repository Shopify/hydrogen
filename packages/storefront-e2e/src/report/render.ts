import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  ReportCheckpoint,
  ReportDocument,
  ReportEvent,
  ReportRun,
  ReportScreenshot,
} from "./view-model.ts";

/*
 * Renders the report view model to one self-contained HTML file.
 *
 * Safety rules:
 * - Every string from the view model is untrusted (store and agent content). It is
 *   HTML-escaped on output. No view-model value goes into a script, style, or selector.
 * - Local hrefs are checked again here (relative paths only). External links must be
 *   http or https.
 * - A strict Content-Security-Policy allows only the inline CSS and JS of this file (by
 *   hash) and local images. The report makes no network requests.
 */

const CSS = readFileSync(new URL("./report.css", import.meta.url), "utf8");
const CLIENT_JS = readFileSync(new URL("./report-client.js", import.meta.url), "utf8");

const VERDICT_ORDER = ["fail", "indeterminate", "skipped", "pass"] as const;
type KnownVerdict = (typeof VERDICT_ORDER)[number];

const VERDICTS: Record<KnownVerdict, { label: string; glyph: string; help: string }> = {
  pass: {
    label: "Pass",
    glyph: "✓",
    help: "Every checkpoint passed. The checks below show the exact values.",
  },
  fail: {
    label: "Fail",
    glyph: "✕",
    help: "The runner checked the result and it did not match what was expected.",
  },
  indeterminate: {
    label: "Indeterminate",
    glyph: "◐",
    help: "Indeterminate is not a failure. The runner could not prove a pass or a fail, so it gives no verdict on the storefront. Use the cause, the agent explanation, and the evidence below to find out why.",
  },
  skipped: {
    label: "Skipped",
    glyph: "–",
    help: "The test did not run. No storefront result was recorded.",
  },
};

const ERROR_KINDS: Record<string, string> = {
  setup: "Setup problem. The run could not start as configured.",
  api: "Storefront API problem. The runner could not read or confirm data from the API.",
  browser:
    "Browser or checkout capture problem. The runner could not confirm what the browser did.",
  buyer: "The agent did not finish the task.",
  context: "The country or language changed, or could not be confirmed.",
  timeout: "The run reached its time limit.",
  internal: "Internal runner error.",
};

// Buyer actions that only look at the page. Hidden by the "key moments" filter.
const OBSERVE_ACTIONS = new Set(["ariaTree", "screenshot", "wait", "extract", "observe"]);
const ROUTINE_KINDS = new Set([
  "screenshot",
  "standard-event",
  "storefront-locale",
  "storefront-context",
]);

const MAX_DETAIL_ROWS = 200;
const MAX_ALT_LENGTH = 160;

// ---------- Public API ----------

export function renderReport(document: ReportDocument): string {
  const runs = document.runs;
  const latest = sortLatest(runs);
  const earlier = sortNewestFirst(runs.filter((run) => !run.latest));
  const indexOf = new Map(runs.map((run, index) => [run, index]));
  const selected = latest[0] ?? earlier[0];
  const style = CSS;
  const script = CLIENT_JS;
  const csp = [
    "default-src 'none'",
    "img-src 'self' file:",
    `style-src '${sha256(style)}'`,
    `script-src '${sha256(script)}'`,
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ].join("; ");

  const context: RenderContext = { runs, indexOf, selected };
  const body =
    runs.length === 0
      ? renderEmptyReport()
      : `<div class="layout">${renderRail(latest, earlier, context)}<main id="main" class="runs" tabindex="-1">${renderNoJsHint()}${runs.map((run) => renderRunPanel(run, context)).join("")}</main></div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(pageTitle(latest))}</title>
<style>${style}</style>
<script>${script}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to run details</a>
${renderMasthead(document, latest, earlier.length)}
${renderDocumentWarnings(document.warnings)}
${body}
${renderLightbox()}
</body>
</html>
`;
}

/** Escapes text for HTML text and quoted attribute values. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Returns the href when it is a plain relative path, else undefined. */
export function safeLocalHref(href: string | undefined): string | undefined {
  if (href === undefined || href === "") return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return undefined;
  if (href.startsWith("/") || href.includes("\\")) return undefined;
  if (hasControlOrSpace(href)) return undefined;
  return href;
}

function hasControlOrSpace(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** Returns a normalized http(s) URL without credentials, else undefined. */
export function safeExternalHref(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  if (url.username !== "" || url.password !== "") return undefined;
  return url.href;
}

// ---------- Helpers ----------

type RenderContext = {
  runs: ReportRun[];
  indexOf: Map<ReportRun, number>;
  selected: ReportRun | undefined;
};

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const esc = escapeHtml;

function sha256(value: string): string {
  return `sha256-${createHash("sha256").update(value, "utf8").digest("base64")}`;
}

function isKnownVerdict(value: string): value is KnownVerdict {
  return Object.hasOwn(VERDICTS, value);
}

function verdictClass(value: string): string {
  return isKnownVerdict(value) ? `v-${value}` : "v-unknown";
}

function verdictLabel(value: string): string {
  return isKnownVerdict(value) ? VERDICTS[value].label : value;
}

function badge(value: string): string {
  const glyph = isKnownVerdict(value) ? VERDICTS[value].glyph : "?";
  return `<span class="badge ${verdictClass(value)}"><span class="glyph" aria-hidden="true">${glyph}</span>${esc(verdictLabel(value))}</span>`;
}

function severity(value: string): number {
  const position = VERDICT_ORDER.findIndex((verdict) => verdict === value);
  return position === -1 ? VERDICT_ORDER.length : position;
}

function sortLatest(runs: ReportRun[]): ReportRun[] {
  return runs
    .filter((run) => run.latest)
    .toSorted(
      (a, b) =>
        severity(a.verdict) - severity(b.verdict) || a.storeName.localeCompare(b.storeName, "en"),
    );
}

function sortNewestFirst(runs: ReportRun[]): ReportRun[] {
  return runs.toSorted((a, b) => timeOf(b.startedAt) - timeOf(a.startedAt));
}

function timeOf(iso: string): number {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

function indexFor(run: ReportRun, context: RenderContext): number {
  return context.indexOf.get(run) ?? -1;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function formatDate(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : `${DATE_FORMAT.format(time)} UTC`;
}

function formatClock(epochMs: number): string {
  return Number.isFinite(epochMs) ? `${TIME_FORMAT.format(epochMs)} UTC` : "";
}

function isoOf(epochMs: number): string {
  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString() : "";
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds - minutes * 60)} s`;
}

function formatOffset(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const sign = ms < 0 ? "−" : "+";
  const seconds = Math.abs(ms) / 1000;
  if (seconds < 60) return `${sign}${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds - minutes * 60);
  return `${sign}${minutes}:${String(rest).padStart(2, "0")}`;
}

function runStart(run: ReportRun): number {
  const parsed = Date.parse(run.startedAt);
  if (!Number.isNaN(parsed)) return parsed;
  return run.timeline[0]?.timestamp ?? Number.NaN;
}

function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function toJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return "Could not show this value.";
  }
}

function jsonDisclosure(label: string, value: unknown): string {
  return `<details class="disclosure"><summary>${esc(label)}</summary><pre class="json">${esc(toJson(value))}</pre></details>`;
}

function pageTitle(latest: ReportRun[]): string {
  const open = latest.filter((run) => run.verdict === "fail" || run.verdict === "indeterminate");
  return open.length === 0
    ? "Storefront E2E report"
    : `Storefront E2E report (${pluralize(open.length, "run")} to review)`;
}

// ---------- Masthead and rail ----------

function renderMasthead(document: ReportDocument, latest: ReportRun[], earlier: number): string {
  return `<header class="masthead">
<div>
<p class="eyebrow">Storefront E2E</p>
<h1>Test run report</h1>
<p class="generated">Generated ${esc(formatDate(document.generatedAt))}</p>
</div>
${renderTally(latest, earlier)}
</header>`;
}

function renderTally(latest: ReportRun[], earlier: number): string {
  const counts = VERDICT_ORDER.map((verdict) => ({
    verdict,
    count: latest.filter((run) => run.verdict === verdict).length,
  }));
  const shown = counts.filter((entry) => entry.count > 0);
  const legend =
    shown.length === 0
      ? "<li>No latest results</li>"
      : shown
          .map(
            (entry) =>
              `<li><b>${entry.count}</b>${esc(VERDICTS[entry.verdict].label.toLowerCase())}</li>`,
          )
          .join("");
  const note =
    earlier > 0
      ? `<p class="tally-note">${esc(pluralize(earlier, "earlier attempt"))} not counted.</p>`
      : "";
  return `<section class="tally" aria-labelledby="tally-heading">
<h2 id="tally-heading">Latest result for each store and test: ${latest.length}</h2>
${renderTallyBar(shown, latest.length)}
<ul class="tally-legend">${legend}</ul>
${note}
</section>`;
}

function renderTallyBar(
  shown: Array<{ verdict: KnownVerdict; count: number }>,
  total: number,
): string {
  if (total === 0) return '<div class="tally-bar" aria-hidden="true"></div>';
  let x = 0;
  const rects = shown.map((entry) => {
    const width = (entry.count / total) * 100;
    const rect = `<rect class="seg-${entry.verdict}" x="${x.toFixed(3)}" y="0" width="${width.toFixed(3)}" height="12"/>`;
    x += width;
    return rect;
  });
  return `<svg class="tally-bar" viewBox="0 0 100 12" preserveAspectRatio="none" width="100%" height="12" aria-hidden="true" focusable="false">
<defs><pattern id="indet-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#e9c56f"/><rect width="3" height="6" fill="#d9a93d"/></pattern></defs>
${rects.join("")}</svg>`;
}

function renderRail(latest: ReportRun[], earlier: ReportRun[], context: RenderContext): string {
  const latestList =
    latest.length === 0
      ? '<p class="empty">No latest results.</p>'
      : `<div class="run-list" role="tablist" aria-labelledby="latest-heading" aria-orientation="vertical">${latest.map((run) => renderRunTab(run, context, false)).join("")}</div>`;
  const selectedIsEarlier = context.selected !== undefined && !context.selected.latest;
  const earlierBlock =
    earlier.length === 0
      ? ""
      : `<details class="earlier"${selectedIsEarlier ? " open" : ""}>
<summary>Earlier attempts (${earlier.length})</summary>
<p id="earlier-heading">Older runs of the same store and test. Not counted in the totals.</p>
<div class="run-list" role="tablist" aria-labelledby="earlier-heading" aria-orientation="vertical">${earlier.map((run) => renderRunTab(run, context, true)).join("")}</div>
</details>`;
  return `<nav class="rail" aria-label="Runs">
<h2 id="latest-heading">Latest results</h2>
${latestList}
${earlierBlock}
</nav>`;
}

function renderRunTab(run: ReportRun, context: RenderContext, earlier: boolean): string {
  const index = indexFor(run, context);
  const selected = run === context.selected;
  const meta = earlier
    ? `${formatDate(run.startedAt)} · ${formatDuration(run.durationMs)}`
    : `${run.scenario} · ${formatDuration(run.durationMs)}`;
  return `<a class="run-tab ${verdictClass(run.verdict)}" role="tab" id="tab-${index}" href="#run-${index}" data-run-tab="${index}" aria-controls="run-${index}" aria-selected="${selected ? "true" : "false"}">
${badge(run.verdict)}<span class="meta">${esc(meta)}</span>
<span class="store">${esc(run.storeName)}</span>
<span class="reason">${esc(run.reason)}</span>
</a>`;
}

function renderNoJsHint(): string {
  return '<p class="no-js-hint">All runs are shown below. Turn on JavaScript to show one run at a time and to enlarge screenshots in place.</p>';
}

function renderEmptyReport(): string {
  return `<main id="main" class="empty-report" tabindex="-1">
<h2>No runs found</h2>
<p>The report found no run results. Run a test, then generate the report again.</p>
</main>`;
}

function renderDocumentWarnings(warnings: string[]): string {
  if (warnings.length === 0) return "";
  return `<section class="notice" role="note" aria-labelledby="report-warnings">
<h2 id="report-warnings">Report warnings (${warnings.length})</h2>Some artifacts could not be read. The report shows what was available.
<ul>${warnings.map((warning) => `<li>${esc(warning)}</li>`).join("")}</ul>
</section>`;
}

// ---------- Run panel ----------

function renderRunPanel(run: ReportRun, context: RenderContext): string {
  const index = indexFor(run, context);
  const active = run === context.selected;
  return `<article class="run-panel${active ? " is-active" : ""}" id="run-${index}" data-run-panel="${index}" role="tabpanel" aria-labelledby="run-${index}-title">
${renderRunHead(run, index)}
${renderVerdict(run, context)}
${renderExplanation(run)}
${renderCheckpoints(run)}
${renderFilmstrip(run)}
${renderTrace(run)}
${renderArtifacts(run)}
</article>`;
}

function renderRunHead(run: ReportRun, index: number): string {
  const href = safeExternalHref(run.storefrontUrl);
  const url =
    href === undefined
      ? esc(run.storefrontUrl)
      : `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(run.storefrontUrl)}</a>`;
  const parts = [
    `Test <code>${esc(run.scenario)}</code>`,
    `Started ${esc(formatDate(run.startedAt))}`,
    `took ${esc(formatDuration(run.durationMs))}`,
  ];
  if (run.model !== undefined) parts.push(`model <code>${esc(run.model)}</code>`);
  const flag = run.latest
    ? ""
    : '<p class="history-flag">Earlier attempt. Not counted in the totals.</p>';
  return `<header class="run-head">
<div>
<h2 id="run-${index}-title" tabindex="-1" data-run-heading>${esc(run.storeName)}</h2>
<p class="sub">${url}</p>
<p class="sub">${parts.join(" · ")}</p>
</div>
${flag}
</header>`;
}

function renderVerdict(run: ReportRun, context: RenderContext): string {
  const known = isKnownVerdict(run.verdict);
  const note =
    run.verdict === "indeterminate" ? "<small>Not a failure: no verdict on the store</small>" : "";
  const help = known ? `<p class="verdict-help">${esc(VERDICTS[run.verdict].help)}</p>` : "";
  return `<section class="verdict ${verdictClass(run.verdict)}" aria-label="Result">
<p class="verdict-label"><span>${esc(verdictLabel(run.verdict))}</span>${note}</p>
<p class="verdict-reason">${esc(run.reason)}</p>
${renderCause(run.errorKind)}
${help}
${renderAttempts(run, context)}
</section>`;
}

function renderCause(errorKind: string | undefined): string {
  if (errorKind === undefined) return "";
  const label = Object.hasOwn(ERROR_KINDS, errorKind)
    ? ERROR_KINDS[errorKind]
    : "Unknown cause type.";
  return `<dl class="verdict-cause"><dt>Cause</dt><dd>${esc(label)} <code>${esc(errorKind)}</code></dd></dl>`;
}

function renderAttempts(run: ReportRun, context: RenderContext): string {
  const same = sortNewestFirst(
    context.runs.filter(
      (other) => other.storefrontUrl === run.storefrontUrl && other.scenario === run.scenario,
    ),
  );
  if (same.length < 2) return "";
  const chips = same.map((other) => {
    const index = indexFor(other, context);
    const current = other === run ? ' aria-current="true"' : "";
    const label = other.latest ? "latest" : formatDate(other.startedAt);
    return `<li><a class="attempt" href="#run-${index}" data-run-link="${index}"${current}>${badge(other.verdict)}${esc(label)}</a></li>`;
  });
  return `<ul class="attempts" aria-label="All attempts for this store and test"><li class="label">All attempts (${same.length}):</li>${chips.join("")}</ul>`;
}

// ---------- Recorded agent explanation and setup ----------

function findEvents(run: ReportRun, kind: string): ReportEvent[] {
  return run.timeline.filter((event) => event.kind === kind);
}

function renderExplanation(run: ReportRun): string {
  return `<section class="section">
<div class="section-head"><h3>Recorded agent explanation</h3><p>Exact statements the agent saved. This is not hidden or private reasoning.</p></div>
<div class="two-col">
<div class="card">${renderAgentStatements(run)}</div>
<div class="card">${renderSetup(run)}</div>
</div>
</section>`;
}

function renderAgentStatements(run: ReportRun): string {
  const start = runStart(run);
  const friction = findEvents(run, "buyer.friction");
  const frictionList =
    friction.length === 0
      ? '<p class="empty">The agent reported no friction.</p>'
      : `<ul class="friction">${friction.map((event) => renderFrictionItem(event, start)).join("")}</ul>`;
  const statements = countAgentStatements(run);
  const trace =
    statements === 0
      ? "The agent saved no step-by-step statements."
      : `The decision trace below has ${pluralize(statements, "statement")} that the agent saved during its steps.`;
  return `<h4>Final answer</h4>${renderFinalAnswer(run)}
<h4>Friction log</h4>${frictionList}
<p class="prose trace-pointer">${esc(trace)}</p>`;
}

/**
 * The agent's own final words come from the `buyer.final-answer` event. When the
 * runner stopped the agent first, the saved summary is the runner's note, so it is
 * labelled as such and never shown as an agent quote.
 */
function renderFinalAnswer(run: ReportRun): string {
  const finalAnswer = findEvents(run, "buyer.final-answer")
    .map((event) => stringField(event.data, "message") ?? event.summary)
    .findLast((message) => message !== undefined);
  if (finalAnswer !== undefined) {
    return `<blockquote class="quote">${esc(finalAnswer)}<span class="quote-src">Final answer saved by the agent</span></blockquote>`;
  }
  const summary = run.buyerSummary;
  if (summary === undefined || summary === "") {
    return '<p class="empty">The agent saved no final answer.</p>';
  }
  const stopped = run.checkpoints.some(
    (checkpoint) => checkpoint.buyer?.reason === "aborted" && checkpoint.buyer.summary === summary,
  );
  if (stopped) {
    return `<p class="empty">The agent gave no final answer because the runner stopped it. Runner note: “${esc(summary)}”</p>`;
  }
  return `<blockquote class="quote">${esc(summary)}<span class="quote-src">Summary saved for the agent</span></blockquote>`;
}

function renderFrictionItem(event: ReportEvent, start: number): string {
  const message = stringField(event.data, "message") ?? event.summary ?? event.title;
  const url = stringField(event.data, "url");
  const where = url === undefined ? "" : ` · ${url}`;
  return `<li><span class="when">${esc(formatOffset(event.timestamp - start))}${esc(where)}</span>${esc(message)}</li>`;
}

function countAgentStatements(run: ReportRun): number {
  const seen = new Set<string>();
  for (const event of run.timeline) {
    const text = event.kind === "buyer.step" ? stringField(event.data, "agentText") : undefined;
    if (text !== undefined) seen.add(text);
  }
  return seen.size;
}

function renderSetup(run: ReportRun): string {
  const locale = [run.context.country, run.context.language].filter(
    (value): value is string => value !== undefined,
  );
  const localeText =
    locale.length === 0 ? "Not confirmed" : `${locale.join(" / ")} (frozen at the start)`;
  const mismatch =
    run.context.mismatch === undefined
      ? ""
      : `<p class="alert" role="note">${esc(run.context.mismatch)}</p>`;
  const objective =
    run.objective === undefined
      ? ""
      : `<details class="disclosure"><summary>Task given to the agent</summary><p class="prose">${esc(run.objective)}</p></details>`;
  return `<h4>Test setup</h4>
<dl class="facts">
<dt>Country / language</dt><dd>${esc(localeText)}</dd>
${renderPinned(run)}
</dl>
${mismatch}
${objective}`;
}

function renderPinned(run: ReportRun): string {
  const pinned = run.pinned;
  if (pinned === undefined) return "<dt>Product</dt><dd>No product was pinned.</dd>";
  const options = pinned.selectedOptions
    .map((option) => `<span class="chip">${esc(option.name)}: ${esc(option.value)}</span>`)
    .join("");
  const variantId =
    pinned.variantId === undefined
      ? ""
      : `<dt>Variant ID</dt><dd><code>${esc(pinned.variantId)}</code></dd>`;
  return `<dt>Pinned product</dt><dd>${esc(pinned.productTitle)}</dd>
<dt>Variant</dt><dd>${esc(pinned.variantTitle)}</dd>
${options === "" ? "" : `<dt>Options</dt><dd>${options}</dd>`}
${variantId}`;
}

// ---------- Checkpoints ----------

function renderCheckpoints(run: ReportRun): string {
  const body =
    run.checkpoints.length === 0
      ? '<p class="empty">No checkpoint ran. Nothing was checked against the store.</p>'
      : `<div class="checkpoints">${run.checkpoints.map((checkpoint) => renderCheckpoint(checkpoint, run)).join("")}</div>`;
  return `<section class="section">
<div class="section-head"><h3>Checks</h3><p>What the runner checked, with expected and actual values.</p></div>
${body}
</section>`;
}

function renderCheckpoint(checkpoint: ReportCheckpoint, run: ReportRun): string {
  return `<div class="card checkpoint">
<div class="checkpoint-head"><h4>${esc(checkpoint.name)}</h4>${badge(checkpoint.verdict)}</div>
<p class="reason">${esc(checkpoint.reason)}</p>
${renderCheckpointBuyer(checkpoint, run)}
${renderCheckpointDetails(checkpoint)}
</div>`;
}

const BUYER_STOP_REASONS: Record<string, string> = {
  aborted: "The runner stopped the agent.",
  completed: "The agent ended its run.",
};

function renderCheckpointBuyer(checkpoint: ReportCheckpoint, run: ReportRun): string {
  const buyer = checkpoint.buyer;
  if (buyer === undefined) return "";
  const summary =
    buyer.summary === "" || buyer.summary === run.buyerSummary
      ? ""
      : `<dt>Agent summary</dt><dd>${esc(buyer.summary)}</dd>`;
  const reasonHint = Object.hasOwn(BUYER_STOP_REASONS, buyer.reason)
    ? ` ${esc(BUYER_STOP_REASONS[buyer.reason])}`
    : "";
  return `<dl class="facts checkpoint-facts">
<dt>Agent says task done</dt><dd>${buyer.completed ? "Yes" : "No"}</dd>
<dt>How the agent stopped</dt><dd><code>${esc(buyer.reason)}</code>${reasonHint}</dd>
${summary}
</dl>`;
}

function renderCheckpointDetails(checkpoint: ReportCheckpoint): string {
  const details = checkpoint.details;
  if (details === undefined || Object.keys(details).length === 0) {
    return '<p class="not-verified"><strong>Not verified:</strong> no API check result was recorded for this checkpoint. The cart and checkout were not confirmed.</p>';
  }
  const rows: DetailRow[] = [];
  flattenDetails(details, "", rows);
  const more =
    rows.length >= MAX_DETAIL_ROWS
      ? `<p class="prose">Only the first ${MAX_DETAIL_ROWS} values are shown. See the raw JSON.</p>`
      : "";
  return `<table class="kv"><caption>Check values</caption><tbody>${rows.map(renderDetailRow).join("")}</tbody></table>
${more}
${jsonDisclosure("Show raw check data (JSON)", details)}`;
}

type DetailRow = { path: string; value: unknown };

function flattenDetails(value: unknown, path: string, rows: DetailRow[]): void {
  if (rows.length >= MAX_DETAIL_ROWS) return;
  const entries = childEntries(value, path);
  if (entries === undefined) {
    rows.push({ path: path === "" ? "value" : path, value });
    return;
  }
  for (const [childPath, child] of entries) flattenDetails(child, childPath, rows);
}

function childEntries(value: unknown, path: string): Array<[string, unknown]> | undefined {
  if (Array.isArray(value)) {
    return value.length === 0 ? undefined : value.map((item, i) => [`${path}[${i}]`, item]);
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return undefined;
    return keys.map((key) => [path === "" ? key : `${path}.${key}`, value[key]]);
  }
  return undefined;
}

function renderDetailRow(row: DetailRow): string {
  const leaf = row.path.split(".").at(-1) ?? row.path;
  const expected = /^expected/i.test(leaf) ? ' class="is-expected"' : "";
  return `<tr${expected}><th scope="row">${esc(row.path)}</th><td>${renderDetailValue(row.value)}</td></tr>`;
}

function renderDetailValue(value: unknown): string {
  if (typeof value === "boolean") {
    return `<span class="bool-${value ? "true" : "false"}">${value ? "true" : "false"}</span>`;
  }
  if (typeof value === "string") return esc(value);
  if (Array.isArray(value)) return "[] (empty)";
  if (isRecord(value)) return "{} (empty)";
  return esc(toJson(value));
}

// ---------- Screenshots ----------

function shotTitle(shot: ReportScreenshot, start: number): string {
  return `Step ${shot.step} · ${formatOffset(shot.timestamp - start)}`;
}

function shotAlt(shot: ReportScreenshot): string {
  return truncate(`Screenshot at step ${shot.step}: ${shot.summary}`, MAX_ALT_LENGTH);
}

function renderShotLink(
  shot: ReportScreenshot,
  index: number,
  start: number,
  inner: string,
  className: string,
): string {
  const href = safeLocalHref(shot.href);
  if (href === undefined) {
    return `<span class="${className}"><span class="shot-frame is-missing" role="img" aria-label="${esc(`Step ${shot.step}: image link not available`)}"></span></span>`;
  }
  const title = shotTitle(shot, start);
  return `<a class="shot ${className}" href="${esc(href)}" data-shot data-shot-index="${index}" data-title="${esc(title)}" data-alt="${esc(shotAlt(shot))}" data-caption="${esc(shot.summary)}" aria-label="${esc(`Enlarge screenshot, ${title}`)}">${inner}</a>`;
}

function shotFrame(shot: ReportScreenshot): string {
  const href = safeLocalHref(shot.href) ?? "";
  return `<span class="shot-frame"><img src="${esc(href)}" alt="${esc(shotAlt(shot))}" loading="lazy" decoding="async"><span class="shot-step" aria-hidden="true">${shot.step}</span></span>`;
}

function renderFilmstrip(run: ReportRun): string {
  const start = runStart(run);
  const shots = run.screenshots;
  const body =
    shots.length === 0
      ? '<p class="empty">No screenshots were saved for this run.</p>'
      : `<ol class="filmstrip">${shots
          .map(
            (shot, index) =>
              `<li>${renderShotLink(shot, index, start, `${shotFrame(shot)}<span class="shot-time" title="${esc(formatClock(shot.timestamp))}">${esc(shotTitle(shot, start))}</span><span class="shot-caption">${esc(shot.summary)}</span>`, "")}</li>`,
          )
          .join("")}</ol>`;
  return `<section class="section">
<div class="section-head"><h3>Screenshots</h3><p>${shots.length === 0 ? "" : `${pluralize(shots.length, "screenshot")}. Select one to enlarge it.`}</p></div>
${body}
</section>`;
}

// ---------- Decision trace ----------

type Tone = "agent" | "warn" | "good" | "plain";
type EventLook = {
  glyph: string;
  tone: Tone;
  routine: boolean;
  /** Exact saved agent text to show as a quote. */
  quote?: string;
  /** Text that the summary must not repeat. */
  echo?: string;
};

function lookFor(event: ReportEvent, previousAgentText: string | undefined): EventLook {
  switch (event.kind) {
    case "buyer.step":
      return buyerStepLook(event, previousAgentText);
    case "buyer.friction":
      return agentMessageLook(event, "!", "warn");
    case "buyer.final-answer":
      return agentMessageLook(event, "❝", "agent");
    case "buyer.act.start":
      return { glyph: "▶", tone: "plain", routine: false };
    case "buyer.act.end":
      return { glyph: "■", tone: "plain", routine: false };
    case "checkout":
      return { glyph: "→", tone: "good", routine: false };
    case "navigation-blocked":
      return { glyph: "⊘", tone: "plain", routine: false };
    default:
      return otherLook(event.kind);
  }
}

function agentMessageLook(event: ReportEvent, glyph: string, tone: Tone): EventLook {
  const message = stringField(event.data, "message");
  return { glyph, tone, routine: false, quote: message, echo: message };
}

function otherLook(kind: string): EventLook {
  if (/error|warn|fail/i.test(kind)) return { glyph: "!", tone: "warn", routine: false };
  if (kind === "screenshot") return { glyph: "▣", tone: "plain", routine: true };
  if (ROUTINE_KINDS.has(kind)) return { glyph: "·", tone: "plain", routine: true };
  return { glyph: "•", tone: "plain", routine: false };
}

function buyerStepLook(event: ReportEvent, previousAgentText: string | undefined): EventLook {
  const action = stringField(event.data, "action") ?? "";
  const failed = event.data.ok === false;
  const text = stringField(event.data, "agentText");
  // The agent's statement is saved on every tool call of one turn. Quote it once.
  const quote = text !== undefined && text !== previousAgentText ? text : undefined;
  const routine = OBSERVE_ACTIONS.has(action) && !failed && quote === undefined;
  return { glyph: failed ? "!" : "›", tone: failed ? "warn" : "agent", routine, quote, echo: text };
}

type TracedEvent = { event: ReportEvent; look: EventLook; repeats: number };

function traceEvents(run: ReportRun): TracedEvent[] {
  let previousAgentText: string | undefined;
  const traced: TracedEvent[] = [];
  for (const event of run.timeline) {
    const last = traced.at(-1);
    if (last !== undefined && isRepeat(last.event, event)) {
      last.repeats += 1;
      continue;
    }
    traced.push({ event, look: lookFor(event, previousAgentText), repeats: 1 });
    if (event.kind === "buyer.step") {
      previousAgentText = stringField(event.data, "agentText") ?? previousAgentText;
    }
  }
  return traced;
}

/** Identical back-to-back runner records (such as repeated warnings) are shown once. */
function isRepeat(previous: ReportEvent, event: ReportEvent): boolean {
  return (
    !event.kind.startsWith("buyer.") &&
    event.kind !== "screenshot" &&
    previous.kind === event.kind &&
    previous.title === event.title &&
    previous.summary === event.summary &&
    previous.screenshotHref === event.screenshotHref &&
    toJson(previous.data) === toJson(event.data)
  );
}

/**
 * Many events point to the same screenshot (the page after that turn). Show each
 * screenshot once: on the first key event that points to it, else on the first event.
 */
function thumbnailOwners(traced: TracedEvent[]): Set<TracedEvent> {
  const owners = new Map<string, TracedEvent>();
  for (const item of traced) {
    const href = item.event.screenshotHref;
    if (href === undefined) continue;
    const current = owners.get(href);
    if (current === undefined || (current.look.routine && !item.look.routine)) {
      owners.set(href, item);
    }
  }
  return new Set(owners.values());
}

function renderTrace(run: ReportRun): string {
  const traced = traceEvents(run);
  if (traced.length === 0) {
    return `<section class="section"><div class="section-head"><h3>Decision trace</h3></div><p class="empty">No evidence was recorded for this run.</p></section>`;
  }
  const trace: TraceContext = {
    run,
    start: runStart(run),
    shotIndex: new Map(run.screenshots.map((shot, index) => [shot.href, index])),
    thumbs: thumbnailOwners(traced),
  };
  const total = run.timeline.length;
  const keyCount = traced
    .filter((item) => !item.look.routine)
    .reduce((sum, item) => sum + item.repeats, 0);
  return `<section class="section trace">
<div class="section-head"><h3>Decision trace</h3>
<label class="trace-filter"><input type="checkbox" checked> Show key moments only</label></div>
<p class="prose trace-intro">Recorded actions, agent statements, and runner checks, in order. Times are from the start of the run. <span class="trace-count-key">Showing ${keyCount} of ${total} events.</span><span class="trace-count-all">Showing all ${total} events.</span></p>
<ol class="timeline">${traced.map((item) => renderEvent(item, trace)).join("")}</ol>
</section>`;
}

type TraceContext = {
  run: ReportRun;
  start: number;
  shotIndex: Map<string, number>;
  thumbs: Set<TracedEvent>;
};

const LONG_SUMMARY = 240;

function renderSummary(event: ReportEvent, look: EventLook): string {
  const summary = event.summary;
  if (summary === undefined || summary === "" || summary === look.echo) return "";
  if (summary.length <= LONG_SUMMARY) return `<p class="ev-summary">${esc(summary)}</p>`;
  return `<p class="ev-summary">${esc(truncate(summary, LONG_SUMMARY))}</p><details class="disclosure"><summary>Show full text</summary><p class="prose">${esc(summary)}</p></details>`;
}

function renderEvent(item: TracedEvent, trace: TraceContext): string {
  const { event, look } = item;
  const classes = ["ev", `tone-${look.tone}`];
  if (look.routine) classes.push("is-routine");
  const quote =
    look.quote === undefined
      ? ""
      : `<blockquote class="quote">${esc(look.quote)}<span class="quote-src">Recorded agent statement</span></blockquote>`;
  const thumb = trace.thumbs.has(item) ? renderEventThumb(event, trace.run, trace) : "";
  const raw = Object.keys(event.data).length === 0 ? "" : jsonDisclosure("Raw data", event.data);
  const step = event.step === undefined ? "" : ` · step ${event.step}`;
  const repeats =
    item.repeats > 1 ? `<span class="ev-repeat">Recorded ${item.repeats} times</span>` : "";
  return `<li class="${classes.join(" ")}">
<span class="ev-time"><time datetime="${esc(isoOf(event.timestamp))}" title="${esc(formatClock(event.timestamp))}">${esc(formatOffset(event.timestamp - trace.start))}</time></span>
<span class="ev-dot" aria-hidden="true">${look.glyph}</span>
<div class="ev-body">
<p class="ev-title"><span>${esc(event.title === "" ? event.kind : event.title)}</span>${renderStepStatus(event)}${repeats}<span class="ev-kind">${esc(event.kind)}${step}</span></p>
${renderSummary(event, look)}${renderStepArgs(event)}${quote}${thumb}${raw}
</div>
</li>`;
}

function renderStepStatus(event: ReportEvent): string {
  if (event.kind !== "buyer.step" || typeof event.data.ok !== "boolean") return "";
  return event.data.ok
    ? '<span class="ev-status ok">OK</span>'
    : '<span class="ev-status not-ok">Did not work</span>';
}

/** Shows tool arguments that the event title does not already contain. */
function renderStepArgs(event: ReportEvent): string {
  if (event.kind !== "buyer.step") return "";
  const action = stringField(event.data, "action");
  const args = event.data.args;
  if (action === undefined || !isRecord(args) || Object.keys(args).length === 0) return "";
  const instruction = stringField(args, "action");
  if (instruction !== undefined && event.title.includes(instruction)) return "";
  const text =
    instruction === undefined
      ? `${action} ${truncate(toJson(args).replace(/\s+/g, " "), 200)}`
      : `${action}: "${instruction}"`;
  return `<span class="ev-action">${esc(text)}</span>`;
}

function renderEventThumb(event: ReportEvent, run: ReportRun, trace: TraceContext): string {
  const href = event.screenshotHref;
  if (href === undefined) return "";
  const index = trace.shotIndex.get(href) ?? -1;
  // Prefer the filmstrip entry so the enlarged view and its caption match.
  const shot: ReportScreenshot = run.screenshots[index] ?? {
    step: event.step ?? 0,
    href,
    summary: event.summary ?? event.title,
    timestamp: event.timestamp,
  };
  const label = `<span class="ev-thumb-label">Saved screenshot</span>`;
  return renderShotLink(shot, index, trace.start, `${shotFrame(shot)}${label}`, "ev-thumb");
}

// ---------- Artifacts and run warnings ----------

function renderArtifacts(run: ReportRun): string {
  const result = safeLocalHref(run.resultHref);
  const evidence = safeLocalHref(run.evidenceHref);
  const links = [
    artifactLink(result, "result.json", "Result file not available"),
    artifactLink(evidence, "evidence.jsonl", "Evidence file not available"),
  ];
  const warnings =
    run.warnings.length === 0
      ? ""
      : `<div class="card"><h4>Run warnings (${run.warnings.length})</h4><p class="prose">Cleanup or artifact problems. They do not change the result.</p><ul class="warnings-list">${run.warnings.map((warning) => `<li>${esc(warning)}</li>`).join("")}</ul></div>`;
  return `<section class="section">
<div class="section-head"><h3>Raw files</h3><p>Saved files for this run. All values are redacted.</p></div>
<ul class="links">${links.join("")}</ul>
${warnings === "" ? "" : `<div class="section">${warnings}</div>`}
</section>`;
}

function artifactLink(href: string | undefined, label: string, missing: string): string {
  if (href === undefined) return `<li><span class="unavailable">${esc(missing)}</span></li>`;
  return `<li><a href="${esc(href)}"><code>${esc(label)}</code></a></li>`;
}

// ---------- Lightbox ----------

function renderLightbox(): string {
  return `<dialog class="lightbox" id="lightbox" aria-labelledby="lightbox-title">
<div class="lightbox-inner">
<div class="lightbox-bar">
<h2 id="lightbox-title" data-lightbox-title>Screenshot</h2>
<div class="lightbox-tools">
<span class="visually-hidden" aria-live="polite" data-lightbox-count></span>
<button type="button" data-lightbox="prev" aria-label="Previous screenshot">←</button>
<button type="button" data-lightbox="next" aria-label="Next screenshot">→</button>
<a class="open-file" data-lightbox-file href="#" target="_blank" rel="noopener noreferrer">Open file</a>
<button type="button" data-lightbox="close">Close <span class="visually-hidden">screenshot</span></button>
</div>
</div>
<div class="lightbox-stage"><img data-lightbox-image alt=""></div>
<p class="lightbox-caption" data-lightbox-caption></p>
</div>
</dialog>`;
}
