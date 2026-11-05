import { constants, type Dirent } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { errorMessage, type Redactor } from "../evidence.ts";
import { EVIDENCE_FILE, RESULT_FILE } from "./artifacts.ts";
import type {
  ReportCheckpoint,
  ReportEvent,
  ReportRun,
  ReportScreenshot,
  ReportVerdict,
} from "./view-model.ts";

/** Read bounds. A report that hits one says so in a warning. */
export const LOAD_LIMITS = {
  maxDepth: 6,
  maxDirectories: 2_000,
  maxRuns: 500,
  maxResultBytes: 2 * 1024 * 1024,
  maxEvidenceBytes: 16 * 1024 * 1024,
  maxEvidenceLines: 5_000,
  maxLineWarnings: 5,
} as const;

export type LoadLimits = { [K in keyof typeof LOAD_LIMITS]: number };

export type LoadedRuns = { runs: ReportRun[]; warnings: string[] };

const SCREENSHOT_FILE = /^step-\d{1,6}\.png$/;
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git"]);
const BUYER_BOUNDARY = new Set(["buyer.act.start", "buyer.act.end"]);
const TITLE_MAX = 160;

/**
 * Loads saved runs under `inputRoot` for a report written to `outputFile`.
 *
 * It reads only `result.json`, the sibling `evidence.jsonl`, and `step-NNN.png`
 * screenshots. It never follows directory or file symlinks, never trusts paths
 * recorded in a result, and keeps every file inside the real input root. Every
 * loaded string passes through `redactor`. Bad or partial runs become warnings.
 */
export async function loadRuns(options: {
  inputRoot: string;
  outputFile: string;
  redactor: Redactor;
  limits?: Partial<LoadLimits>;
}): Promise<LoadedRuns> {
  const limits = { ...LOAD_LIMITS, ...options.limits };
  const root = await realpath(options.inputRoot);
  const outputDirectory = await realpath(path.dirname(options.outputFile));
  const warnings: string[] = [];
  const found = await findResultFiles(root, limits, warnings);
  if (found.length === 0) {
    warnings.push("No result.json files were found under the input directory.");
  }
  const loaded: ReportRun[] = [];
  for (const file of found) {
    const run = await loadRun({ root, outputDirectory, file, limits, redactor: options.redactor });
    if (typeof run === "string") {
      warnings.push(run);
    } else {
      loaded.push(run);
    }
  }
  const runs = markLatest(dedupeIds(loaded));
  return { runs, warnings: warnings.map((warning) => options.redactor.text(warning)) };
}

// ---------------------------------------------------------------------------
// Discovery

async function findResultFiles(
  root: string,
  limits: LoadLimits,
  warnings: string[],
): Promise<string[]> {
  const found: string[] = [];
  const queue: Array<{ directory: string; depth: number }> = [{ directory: root, depth: 0 }];
  let visited = 0;
  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined) {
      break;
    }
    visited += 1;
    if (visited > limits.maxDirectories) {
      warnings.push(
        `Stopped searching after ${limits.maxDirectories} directories. Some runs can be missing.`,
      );
      break;
    }
    const entries = await readdir(next.directory, { withFileTypes: true });
    const result = entries.find((entry) => entry.name === RESULT_FILE);
    if (result !== undefined) {
      addResult(found, next.directory, result, root, warnings);
      continue;
    }
    if (next.depth < limits.maxDepth) {
      queue.push(...childDirectories(entries, next, root, warnings));
    }
  }
  if (found.length > limits.maxRuns) {
    warnings.push(
      `Found ${found.length} runs. The report shows only the newest ${limits.maxRuns} by directory name.`,
    );
    return found.toSorted().slice(-limits.maxRuns);
  }
  return found;
}

function addResult(
  found: string[],
  directory: string,
  entry: Dirent,
  root: string,
  warnings: string[],
): void {
  const file = path.join(directory, entry.name);
  if (entry.isFile()) {
    found.push(file);
  } else {
    warnings.push(`Skipped ${relative(root, file)}: not a regular file.`);
  }
}

function childDirectories(
  entries: Dirent[],
  parent: { directory: string; depth: number },
  root: string,
  warnings: string[],
): Array<{ directory: string; depth: number }> {
  const children: Array<{ directory: string; depth: number }> = [];
  for (const entry of entries) {
    const directory = path.join(parent.directory, entry.name);
    if (entry.isSymbolicLink()) {
      warnings.push(`Skipped ${relative(root, directory)}: symbolic links are not followed.`);
    } else if (entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name)) {
      children.push({ directory, depth: parent.depth + 1 });
    }
  }
  return children;
}

// ---------------------------------------------------------------------------
// Safe file access

/** Real path of `file` when it is a regular, non-symlink file inside `root`. */
async function safeFile(root: string, file: string): Promise<string | undefined> {
  try {
    const stats = await lstat(file);
    if (!stats.isFile()) {
      return undefined;
    }
    const real = await realpath(file);
    return isInside(root, real) ? real : undefined;
  } catch {
    return undefined;
  }
}

async function readBounded(file: string, maxBytes: number): Promise<string> {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new Error("not a regular file");
    }
    if (stats.size > maxBytes) {
      throw new Error(`larger than ${maxBytes} bytes`);
    }
    return await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
}

function isInside(root: string, file: string): boolean {
  const rel = path.relative(root, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function relative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

/** Relative href from the output directory, percent-encoded per path segment. */
export function toHref(outputDirectory: string, file: string): string {
  return path
    .relative(outputDirectory, file)
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

// ---------------------------------------------------------------------------
// Schemas (applied after redaction)

const VERDICTS = ["pass", "fail", "indeterminate", "skipped"] as const;

const httpUrl = z
  .string()
  .max(2_048)
  .refine((value) => URL.canParse(value) && /^https?:$/.test(new URL(value).protocol), {
    message: "must be an http or https URL",
  });

const localeSchema = z.object({
  country: z.string().max(10).optional().catch(undefined),
  language: z.string().max(10).optional().catch(undefined),
});

const pinnedSchema = z.object({
  productTitle: z.string(),
  variantTitle: z.string(),
  variantId: z.string().optional().catch(undefined),
  selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })).catch([]),
});

const resultSchema = z.object({
  runId: z.string().min(1).max(200),
  scenario: z.string().min(1).max(200),
  verdict: z.enum(VERDICTS),
  reason: z.string(),
  errorKind: z.string().max(100).optional().catch(undefined),
  startedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "must be a date",
  }),
  durationMs: z.number().finite().nonnegative().catch(0),
  target: z.object({
    storefrontUrl: httpUrl,
    locale: localeSchema.optional().catch(undefined),
  }),
  context: z
    .object({
      resolved: localeSchema.optional().catch(undefined),
      mismatch: z.string().optional().catch(undefined),
    })
    .optional()
    .catch(undefined),
  metadata: z
    .object({ buyer: z.object({ model: z.string() }).optional().catch(undefined) })
    .optional()
    .catch(undefined),
  pinned: pinnedSchema.optional().catch(undefined),
  checkpoints: z.array(z.unknown()).catch([]),
  warnings: z.array(z.string()).catch([]),
});

type ParsedResult = z.infer<typeof resultSchema>;

const checkpointSchema = z.object({
  name: z.string(),
  verdict: z.string(),
  reason: z.string(),
  objective: z.string(),
  buyer: z
    .object({ completed: z.boolean(), reason: z.string(), summary: z.string() })
    .optional()
    .catch(undefined),
  details: z.record(z.unknown()).optional().catch(undefined),
});

const evidenceSchema = z.object({
  kind: z.string().min(1).max(100),
  timestamp: z.number().finite(),
  data: z.record(z.unknown()),
});

type Evidence = z.infer<typeof evidenceSchema>;

/** Redacts every string and sensitive key, and returns plain JSON data. */
function redacted(redactor: Redactor, value: unknown): unknown {
  const parsed: unknown = JSON.parse(redactor.serialize(value));
  return parsed;
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
    .join("; ");
}

// ---------------------------------------------------------------------------
// One run

type RunInput = {
  root: string;
  outputDirectory: string;
  file: string;
  limits: LoadLimits;
  redactor: Redactor;
};

async function loadRun(input: RunInput): Promise<ReportRun | string> {
  const name = relative(input.root, input.file);
  const resultFile = await safeFile(input.root, input.file);
  if (resultFile === undefined) {
    return `Skipped ${name}: the file is not a regular file inside the input directory.`;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(await readBounded(resultFile, input.limits.maxResultBytes));
  } catch (error) {
    return `Skipped ${name}: ${errorMessage(error)}`;
  }
  const parsed = resultSchema.safeParse(redacted(input.redactor, raw));
  if (!parsed.success) {
    return `Skipped ${name}: invalid result (${describeIssues(parsed.error)}).`;
  }
  const directory = path.dirname(resultFile);
  const warnings = [...parsed.data.warnings];
  const checkpoints = parseCheckpoints(parsed.data.checkpoints, warnings);
  const evidence = await loadEvidence(input, directory, warnings);
  const screenshots = await collectScreenshots(input, directory, evidence.records, warnings);
  return {
    ...runFields(parsed.data, checkpoints),
    timeline: buildTimeline(evidence.records, screenshots),
    screenshots: [...screenshots.values()],
    checkpoints,
    warnings,
    resultHref: toHref(input.outputDirectory, resultFile),
    ...(evidence.file === undefined
      ? {}
      : { evidenceHref: toHref(input.outputDirectory, evidence.file) }),
    latest: false,
  };
}

function runFields(
  result: ParsedResult,
  checkpoints: ReportCheckpoint[],
): Omit<
  ReportRun,
  "timeline" | "screenshots" | "checkpoints" | "warnings" | "resultHref" | "evidenceHref" | "latest"
> {
  const last = checkpoints.at(-1);
  const model = result.metadata?.buyer?.model;
  return {
    id: result.runId,
    storeName: storeName(result.target.storefrontUrl),
    storefrontUrl: result.target.storefrontUrl,
    scenario: result.scenario,
    verdict: result.verdict satisfies ReportVerdict,
    reason: result.reason,
    ...(result.errorKind === undefined ? {} : { errorKind: result.errorKind }),
    startedAt: result.startedAt,
    durationMs: result.durationMs,
    ...(model === undefined ? {} : { model }),
    context: runContext(result),
    ...(result.pinned === undefined ? {} : { pinned: result.pinned }),
    ...(last === undefined ? {} : { objective: last.objective }),
    ...(last?.buyer === undefined ? {} : { buyerSummary: last.buyer.summary }),
  };
}

/** Hostname without a leading `www.`. */
export function storeName(storefrontUrl: string): string {
  return new URL(storefrontUrl).hostname.replace(/^www\./, "");
}

/** `context.resolved` from current results, else the legacy `target.locale`. */
function runContext(result: ParsedResult): ReportRun["context"] {
  const locale = result.context?.resolved ?? result.target.locale;
  const mismatch = result.context?.mismatch;
  return {
    ...(locale?.country === undefined ? {} : { country: locale.country }),
    ...(locale?.language === undefined ? {} : { language: locale.language }),
    ...(mismatch === undefined ? {} : { mismatch }),
  };
}

function parseCheckpoints(raw: unknown[], warnings: string[]): ReportCheckpoint[] {
  const checkpoints: ReportCheckpoint[] = [];
  for (const [index, entry] of raw.entries()) {
    const parsed = checkpointSchema.safeParse(entry);
    if (!parsed.success) {
      warnings.push(`Ignored checkpoint ${index + 1}: ${describeIssues(parsed.error)}.`);
      continue;
    }
    const { buyer, details, ...rest } = parsed.data;
    checkpoints.push({
      ...rest,
      ...(buyer === undefined ? {} : { buyer }),
      ...(details === undefined ? {} : { details }),
    });
  }
  return checkpoints;
}

// ---------------------------------------------------------------------------
// Evidence

async function loadEvidence(
  input: RunInput,
  directory: string,
  warnings: string[],
): Promise<{ file?: string; records: Evidence[] }> {
  const file = await safeFile(input.root, path.join(directory, EVIDENCE_FILE));
  if (file === undefined) {
    warnings.push(`${EVIDENCE_FILE} is missing or is not a regular file. The timeline is empty.`);
    return { records: [] };
  }
  let content: string;
  try {
    content = await readBounded(file, input.limits.maxEvidenceBytes);
  } catch (error) {
    warnings.push(`${EVIDENCE_FILE} was not read: ${errorMessage(error)}. The timeline is empty.`);
    return { records: [] };
  }
  return { file, records: parseEvidence(content, input, warnings) };
}

function parseEvidence(content: string, input: RunInput, warnings: string[]): Evidence[] {
  const lines = content.split("\n");
  const records: Evidence[] = [];
  let bad = 0;
  for (const [index, line] of lines.entries()) {
    if (line.trim() === "") {
      continue;
    }
    if (records.length >= input.limits.maxEvidenceLines) {
      warnings.push(
        `${EVIDENCE_FILE} has more than ${input.limits.maxEvidenceLines} records. The timeline is truncated.`,
      );
      break;
    }
    const record = parseEvidenceLine(line, input.redactor);
    if (record !== undefined) {
      records.push(record);
      continue;
    }
    bad += 1;
    if (bad <= input.limits.maxLineWarnings) {
      warnings.push(
        `${EVIDENCE_FILE} line ${index + 1} is not a valid evidence record and was skipped.`,
      );
    }
  }
  if (bad > input.limits.maxLineWarnings) {
    warnings.push(`${EVIDENCE_FILE} has ${bad} invalid lines in total.`);
  }
  return records.toSorted((a, b) => a.timestamp - b.timestamp);
}

function parseEvidenceLine(line: string, redactor: Redactor): Evidence | undefined {
  try {
    const parsed = evidenceSchema.safeParse(redacted(redactor, JSON.parse(line)));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** Screenshots named by evidence records. Only existing `step-NNN.png` files in the run directory. */
async function collectScreenshots(
  input: RunInput,
  directory: string,
  records: Evidence[],
  warnings: string[],
): Promise<Map<Evidence, ReportScreenshot>> {
  const screenshots = new Map<Evidence, ReportScreenshot>();
  for (const record of records) {
    if (record.kind !== "screenshot") {
      continue;
    }
    const name = record.data.screenshot;
    const step = record.data.step;
    if (typeof name !== "string" || !SCREENSHOT_FILE.test(name) || !isStep(step)) {
      warnings.push("Ignored a screenshot record with an unexpected file name or step.");
      continue;
    }
    const file = await safeFile(input.root, path.join(directory, name));
    if (file === undefined || path.dirname(file) !== directory) {
      warnings.push(`Screenshot ${name} is missing or unsafe and is not shown.`);
      continue;
    }
    const summary = record.data.summary;
    screenshots.set(record, {
      step,
      href: toHref(input.outputDirectory, file),
      summary: typeof summary === "string" ? summary : "",
      timestamp: record.timestamp,
    });
  }
  return screenshots;
}

function isStep(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

// ---------------------------------------------------------------------------
// Timeline

function buildTimeline(
  records: Evidence[],
  screenshots: Map<Evidence, ReportScreenshot>,
): ReportEvent[] {
  let previousAgentText = "";
  return records.map((record, index) => {
    const shot =
      record.kind === "screenshot"
        ? screenshots.get(record)
        : linkedScreenshot(records, index, screenshots);
    const agentText = record.kind === "buyer.step" ? text(record.data.agentText) : undefined;
    // Stagehand repeats one explanation on every action of a model step. Show it once.
    const repeated = agentText !== undefined && agentText === previousAgentText;
    if (agentText !== undefined) {
      previousAgentText = agentText;
    }
    const description = describe(record);
    const summary = repeated ? undefined : description.summary;
    return {
      id: `e${index + 1}`,
      timestamp: record.timestamp,
      kind: record.kind,
      title: truncate(description.title),
      ...(summary === undefined || summary === "" ? {} : { summary }),
      data: record.data,
      ...(shot === undefined ? {} : { screenshotHref: shot.href, step: shot.step }),
    };
  });
}

/**
 * The screenshot taken after an event in the same buyer run (the post-action
 * capture), else the latest screenshot before it.
 */
function linkedScreenshot(
  records: Evidence[],
  index: number,
  screenshots: Map<Evidence, ReportScreenshot>,
): ReportScreenshot | undefined {
  for (const record of records.slice(index + 1)) {
    if (BUYER_BOUNDARY.has(record.kind)) {
      break;
    }
    const shot = screenshots.get(record);
    if (shot !== undefined) {
      return shot;
    }
  }
  const previous = records.slice(0, index).findLast((record) => screenshots.has(record));
  return previous === undefined ? undefined : screenshots.get(previous);
}

function describe(record: Evidence): { title: string; summary?: string } {
  const data = record.data;
  switch (record.kind) {
    case "buyer.act.start":
      return { title: "Buyer started an objective", summary: text(data.objective) };
    case "buyer.step":
      return describeStep(data);
    case "buyer.friction":
      return { title: "Buyer reported friction", summary: text(data.message) };
    case "buyer.final-answer":
      return { title: "Buyer final answer", summary: text(data.message) };
    case "buyer.act.end":
      return {
        title: `Buyer stopped (reason: ${text(data.reason)}, completed: ${String(data.completed)})`,
        summary: text(data.summary),
      };
    default:
      return describeRunnerEvent(record);
  }
}

function describeStep(data: Record<string, unknown>): { title: string; summary?: string } {
  const action = text(data.action) || "action";
  const args = data.args;
  const detail =
    typeof args === "object" && args !== null
      ? Object.values(args).find((value): value is string => typeof value === "string")
      : undefined;
  const failed = data.ok === false ? " (failed)" : "";
  return {
    title: `Buyer action: ${action}${detail === undefined ? "" : ` - ${detail}`}${failed}`,
    summary: text(data.agentText),
  };
}

function describeRunnerEvent(record: Evidence): { title: string; summary?: string } {
  const data = record.data;
  switch (record.kind) {
    case "screenshot":
      return { title: `Screenshot step ${String(data.step)}`, summary: text(data.summary) };
    case "navigation-blocked":
      return { title: `Navigation blocked: ${text(data.reason)}`, summary: blockedRoute(data) };
    case "checkout":
      return { title: "Checkout handoff captured", summary: text(data.url) };
    case "standard-event":
      return { title: standardEventTitle(data) };
    case "storefront-locale":
      return {
        title: `Storefront locale observed: ${text(data.country)}/${text(data.language)}`,
        summary: text(data.url),
      };
    case "storefront-context":
      return { title: "Storefront context frozen" };
    case "storefront-locale-carried-forward":
      return {
        title: `Storefront locale not set on the page: run context ${text(data.country)}/${text(data.language)} carried forward (not confirmed)`,
        summary: text(data.step),
      };
    case "recorder-error":
      return { title: "Recorder warning", summary: text(data.message) };
    default:
      return { title: record.kind };
  }
}

function blockedRoute(data: Record<string, unknown>): string {
  const route = data.route;
  const parts = [typeof data.frame === "string" ? `${data.frame} frame` : ""];
  if (typeof route === "object" && route !== null && !Array.isArray(route)) {
    const entries = new Map(Object.entries(route));
    parts.push(`${text(entries.get("origin"))}${text(entries.get("route"))}`);
    const cart = entries.get("cart");
    if (typeof cart === "object" && cart !== null) {
      const problem = new Map(Object.entries(cart)).get("problem");
      parts.push(typeof problem === "string" ? `cart: ${problem}` : "");
    }
  }
  return parts.filter((part) => part !== "").join(" - ");
}

function standardEventTitle(data: Record<string, unknown>): string {
  const event = data.event;
  if (typeof event !== "object" || event === null) {
    return "Standard event";
  }
  const fields = new Map(Object.entries(event));
  return `Standard event ${text(fields.get("name"))} (${text(fields.get("phase"))})`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function truncate(value: string): string {
  return value.length > TITLE_MAX ? `${value.slice(0, TITLE_MAX - 1)}…` : value;
}

// ---------------------------------------------------------------------------
// Latest and IDs

function dedupeIds(runs: ReportRun[]): ReportRun[] {
  const seen = new Map<string, number>();
  return runs.map((run) => {
    const count = (seen.get(run.id) ?? 0) + 1;
    seen.set(run.id, count);
    return count === 1 ? run : { ...run, id: `${run.id}-${count}` };
  });
}

/** Newest first. The newest run per storefront URL and scenario is `latest`. */
function markLatest(runs: ReportRun[]): ReportRun[] {
  const sorted = runs.toSorted(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || b.id.localeCompare(a.id),
  );
  const seen = new Set<string>();
  return sorted.map((run) => {
    const key = JSON.stringify([run.storefrontUrl, run.scenario]);
    const latest = !seen.has(key);
    seen.add(key);
    return { ...run, latest };
  });
}
