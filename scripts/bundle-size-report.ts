import type { BundleTarget } from "./bundle-size-scenarios.ts";

export interface BundleSize {
  target: BundleTarget;
  minified: number;
  gzip: number;
}

export interface BundleFailure {
  target: BundleTarget;
  error: string;
}

export interface SizeSnapshot {
  bundles: Record<string, BundleSize>;
  failures: Record<string, BundleFailure>;
}

const WARN_THRESHOLD_PERCENT = 5;
const TARGET_ORDER: Record<BundleTarget, number> = { server: 0, client: 1 };

const TABLE_HEADER = `| Status | Target | Scenario | Minified | Gzip | Δ Minified | Δ Gzip |
|:------:|:-------|:---------|---------:|-----:|-----------:|-------:|`;

const byteFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isTarget = (value: unknown): value is BundleTarget =>
  value === "server" || value === "client";

function parseEntries<T>(value: unknown, parse: (entry: Record<string, unknown>) => T | null) {
  const result: Record<string, T> = {};
  if (!isRecord(value)) return result;
  for (const [name, entry] of Object.entries(value)) {
    const parsed = isRecord(entry) ? parse(entry) : null;
    if (parsed === null) throw new Error(`Malformed snapshot entry "${name}"`);
    result[name] = parsed;
  }
  return result;
}

export function parseSnapshot(value: unknown): SizeSnapshot {
  if (!isRecord(value) || !isRecord(value.bundles)) throw new Error("Snapshot has no bundles");
  return {
    bundles: parseEntries(value.bundles, ({ target, minified, gzip }) =>
      isTarget(target) && typeof minified === "number" && typeof gzip === "number"
        ? { target, minified, gzip }
        : null,
    ),
    failures: parseEntries(value.failures, ({ target, error }) =>
      isTarget(target) && typeof error === "string" ? { target, error } : null,
    ),
  };
}

export function formatBytes(bytes: number): string {
  if (Math.abs(bytes) < 1000) return `${bytes} B`;
  return `${byteFormat.format(bytes / 1000)} kB`;
}

function formatDelta(current: number, baseline: number | undefined): string {
  if (baseline === undefined) return "—";
  const delta = current - baseline;
  if (delta === 0) return "±0";
  const sign = delta > 0 ? "+" : "";
  const percent = baseline === 0 ? "" : ` (${sign}${((delta / baseline) * 100).toFixed(1)}%)`;
  return `${sign}${formatBytes(delta)}${percent}`;
}

function percentChange(current: number, baseline: number): number {
  return baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;
}

function status(current: BundleSize, baseline: BundleSize | undefined): string {
  if (!baseline) return "🆕";
  // Gzip is what ships; fall back to minified so a change never shows as ⚪.
  const gzipPercent = percentChange(current.gzip, baseline.gzip);
  const percent =
    gzipPercent === 0 ? percentChange(current.minified, baseline.minified) : gzipPercent;
  if (percent >= WARN_THRESHOLD_PERCENT) return "🔴";
  if (percent > 0) return "🟡";
  if (percent < 0) return "🟢";
  return "⚪";
}

const tableRow = (cells: string[]) => `| ${cells.join(" | ")} |`;

function sizeRow(name: string, current: BundleSize, baseline: BundleSize | undefined): string {
  return tableRow([
    status(current, baseline),
    current.target,
    name,
    formatBytes(current.minified),
    formatBytes(current.gzip),
    formatDelta(current.minified, baseline?.minified),
    formatDelta(current.gzip, baseline?.gzip),
  ]);
}

function failureRow(name: string, failure: BundleFailure, baseline: BundleSize | undefined) {
  const baseCell = baseline ? formatBytes(baseline.gzip) : "—";
  return tableRow(["❌", failure.target, name, "failed", "failed", "—", `was ${baseCell}`]);
}

function sortByTarget<T extends { target: BundleTarget }>(entries: [string, T][]) {
  return entries.toSorted(
    ([nameA, a], [nameB, b]) =>
      TARGET_ORDER[a.target] - TARGET_ORDER[b.target] || nameA.localeCompare(nameB),
  );
}

export function generateReport(head: SizeSnapshot, base: SizeSnapshot | null): string {
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const [name, current] of sortByTarget(Object.entries(head.bundles))) {
    const baseline = base?.bundles[name];
    const isUnchanged = baseline?.minified === current.minified && baseline.gzip === current.gzip;
    (isUnchanged ? unchanged : changed).push(sizeRow(name, current, baseline));
  }

  const failures = sortByTarget(Object.entries(head.failures));
  changed.unshift(
    ...failures.map(([name, failure]) => failureRow(name, failure, base?.bundles[name])),
  );

  // The first line identifies the sticky PR comment; keep it first.
  const parts = ["<!-- hydrogen-bundle-size-report -->", "## 📦 Bundle size report\n"];
  parts.push(
    changed.length > 0 ? `${TABLE_HEADER}\n${changed.join("\n")}\n` : "_No bundle size changes._\n",
  );
  if (failures.length > 0) {
    parts.push(
      "Some scenarios failed to bundle on this PR. Fix the export or update `scripts/bundle-size-scenarios.ts`:\n",
      ...failures.map(
        ([name, failure]) => `- **${name}**: \`${failure.error.replaceAll("`", "'")}\``,
      ),
      "",
    );
  }
  if (unchanged.length > 0) {
    parts.push(
      `<details>\n<summary>Unchanged (${unchanged.length})</summary>\n\n${TABLE_HEADER}\n${unchanged.join("\n")}\n\n</details>\n`,
    );
  }
  if (!base) {
    parts.push("> The base commit could not be measured, so there are no deltas.\n");
  }
  parts.push(`<details>
<summary>How this is measured</summary>

Each scenario is bundled from the built package with Rolldown (tree-shaken, minified, dynamic imports inlined), then gzipped. Peer dependencies are external. Scenarios live in \`scripts/bundle-size-scenarios.ts\`.

🟢 smaller · 🟡 larger (< ${WARN_THRESHOLD_PERCENT}%) · 🔴 larger (≥ ${WARN_THRESHOLD_PERCENT}%) · 🆕 not in base · ❌ failed to bundle · ⚪ unchanged

</details>
`);

  return parts.join("\n");
}
