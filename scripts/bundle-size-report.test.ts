import assert from "node:assert/strict";
import test from "node:test";

import { generateReport, parseSnapshot, type SizeSnapshot } from "./bundle-size-report.ts";

const targetOf = (name: string) => (name.startsWith("react") ? "client" : "server");

const snapshot = (
  bundles: Record<string, [minified: number, gzip: number]>,
  failures: string[] = [],
): SizeSnapshot => ({
  bundles: Object.fromEntries(
    Object.entries(bundles).map(([name, [minified, gzip]]) => [
      name,
      { target: targetOf(name), minified, gzip },
    ]),
  ),
  failures: Object.fromEntries(
    failures.map((name) => [name, { target: targetOf(name), error: `"${name}" is not exported` }]),
  ),
});

function visibleSection(report: string): string {
  return report.split("<details>")[0] ?? "";
}

test("flags gzip growth at or above 5% red and smaller growth yellow", () => {
  const report = generateReport(
    snapshot({ "cart handlers": [1100, 105], "react cart": [1010, 101] }),
    snapshot({ "cart handlers": [1000, 100], "react cart": [1000, 100] }),
  );

  assert.match(
    report,
    /\| 🔴 \| server \| cart handlers \| 1\.1 kB \| 105 B \| \+100 B \(\+10\.0%\) \| \+5 B \(\+5\.0%\) \|/,
  );
  assert.match(report, /\| 🟡 \| client \| react cart \|/);
});

test("uses the minified change when gzip is identical", () => {
  const report = generateReport(
    snapshot({ "cart handlers": [1100, 100] }),
    snapshot({ "cart handlers": [1000, 100] }),
  );

  assert.match(visibleSection(report), /\| 🔴 \| server \| cart handlers \|/);
});

test("collapses unchanged scenarios and keeps changed and new ones visible", () => {
  const report = generateReport(
    snapshot({ "cart handlers": [900, 90], "react cart": [1000, 100], "vanilla cart": [500, 50] }),
    snapshot({ "cart handlers": [1000, 100], "react cart": [1000, 100] }),
  );
  const visible = visibleSection(report);

  assert.match(
    visible,
    /\| 🟢 \| server \| cart handlers \|.*\| -100 B \(-10\.0%\) \| -10 B \(-10\.0%\) \|/,
  );
  assert.match(visible, /\| 🆕 \| server \| vanilla cart \|.*\| — \| — \|/);
  assert.doesNotMatch(visible, /react cart/);
  assert.match(
    report,
    /<summary>Unchanged \(1\)<\/summary>[\s\S]*\| ⚪ \| client \| react cart \|/,
  );
});

test("surfaces scenarios that fail to bundle on the PR instead of dropping them", () => {
  const report = generateReport(
    snapshot({ "react cart": [1000, 100] }, ["cart handlers"]),
    snapshot({ "cart handlers": [1000, 100], "react cart": [1000, 100] }),
  );
  const visible = visibleSection(report);

  assert.match(visible, /\| ❌ \| server \| cart handlers \|.*\| was 100 B \|/);
  assert.match(visible, /- \*\*cart handlers\*\*: `"cart handlers" is not exported`/);
});

test("lists server scenarios before client scenarios", () => {
  const report = generateReport(snapshot({ "react cart": [1, 1], "cart handlers": [1, 1] }), null);

  assert.ok(report.indexOf("cart handlers") < report.indexOf("react cart"));
});

test("explains a missing base instead of reporting deltas", () => {
  const report = generateReport(snapshot({ "cart handlers": [1000, 100] }), null);

  assert.match(report, /base commit could not be measured/);
  assert.match(report, /\| 🆕 \| server \| cart handlers \|/);
});

// .github/workflows/bundle-size.yml hardcodes this marker to find the comment.
test("starts the report with the sticky comment marker", () => {
  const report = generateReport(snapshot({ "cart handlers": [1, 1] }), null);

  assert.equal(report.split("\n")[0], "<!-- hydrogen-bundle-size-report -->");
});

test("rejects malformed snapshots", () => {
  assert.throws(() => parseSnapshot({ bundles: { x: { target: "edge", minified: 1, gzip: 1 } } }));
  assert.throws(() => parseSnapshot({}));
});
