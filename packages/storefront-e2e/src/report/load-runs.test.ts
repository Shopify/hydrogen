import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, describe, it } from "vitest";

import { loadRuns, storeName, toHref } from "./load-runs.ts";
import { renderReport } from "./render.ts";
import type { ReportRun } from "./view-model.ts";

const roots: string[] = [];
afterAll(async () => {
  await Promise.all(roots.map(async (root) => rm(root, { recursive: true, force: true })));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "storefront-e2e-report-"));
  roots.push(root);
  return root;
}

function result(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    runId: "20261104T000000Z-add-to-cart-aaaa",
    scenario: "add-to-cart",
    verdict: "indeterminate",
    reason: "The buyer did not complete (completed), but no checkout navigation was captured.",
    errorKind: "buyer",
    startedAt: "2026-11-04T00:00:00.000Z",
    finishedAt: "2026-11-04T00:00:30.000Z",
    durationMs: 30_000,
    target: { storefrontUrl: "https://www.shop.example/", apiOrigin: "x", apiVersion: "y" },
    context: { requested: {}, resolved: { country: "CA", language: "EN" }, observations: [] },
    metadata: { node: "v24", tools: {}, buyer: { model: "anthropic/model-a", promptSha256: "0" } },
    pinned: {
      variantId: "gid://shopify/ProductVariant/1",
      variantTitle: "Default Title",
      productTitle: "Album",
      selectedOptions: [{ name: "Title", value: "Default Title" }],
    },
    checkpoints: [
      {
        name: "add-to-cart-and-checkout",
        objective: "Add one unit.",
        buyer: {
          completed: false,
          reason: "completed",
          summary: "Cookie banner blocked checkout.",
        },
        verdict: "indeterminate",
        reason: "No checkout navigation was captured.",
        errorKind: "buyer",
      },
    ],
    observations: { evidenceRecords: 0, standardEvents: 0, checkoutCaptured: false },
    artifacts: { directory: "/etc", evidence: "../../secret", result: "result.json" },
    warnings: [],
    ...overrides,
  };
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

async function writeRun(
  directory: string,
  options: {
    result?: Record<string, unknown> | string;
    evidence?: Array<Record<string, unknown> | string>;
    screenshots?: string[];
  } = {},
): Promise<string> {
  await mkdir(directory, { recursive: true });
  const body = options.result ?? result();
  await writeFile(
    path.join(directory, "result.json"),
    typeof body === "string" ? body : JSON.stringify(body),
  );
  if (options.evidence !== undefined) {
    const lines = options.evidence.map((line) =>
      typeof line === "string" ? line : JSON.stringify(line),
    );
    await writeFile(path.join(directory, "evidence.jsonl"), `${lines.join("\n")}\n`);
  }
  for (const name of options.screenshots ?? []) {
    await writeFile(path.join(directory, name), PNG);
  }
  return directory;
}

function evidence(kind: string, timestamp: number, data: Record<string, unknown>) {
  return { kind, timestamp, data };
}

const BUYER_EVIDENCE = [
  evidence("storefront-locale", 100, {
    country: "CA",
    language: "EN",
    url: "https://shop.example/",
  }),
  evidence("storefront-locale-carried-forward", 150, {
    step: "after the start page opened",
    country: "CA",
    language: "EN",
    reason: "The page set no window.Shopify country or locale.",
  }),
  evidence("buyer.act.start", 200, { objective: "Add one unit.", maxSteps: 20 }),
  evidence("screenshot", 210, {
    step: 1,
    summary: "Before: Add one unit.",
    screenshot: "step-001.png",
  }),
  evidence("buyer.step", 300, {
    action: "act",
    args: { action: "click Add to cart" },
    ok: false,
    agentText: "I will add the item.",
  }),
  evidence("buyer.step", 300, {
    action: "screenshot",
    args: {},
    ok: true,
    agentText: "I will add the item.",
  }),
  evidence("screenshot", 310, {
    step: 2,
    summary: "After: act, screenshot",
    screenshot: "step-002.png",
  }),
  evidence("buyer.friction", 400, { message: "Cookie banner covers checkout." }),
  evidence("navigation-blocked", 405, {
    reason: "checkout",
    frame: "top-level",
    route: {
      origin: "https://shop.app",
      route: "/checkout/:n",
      cart: { readable: false, problem: "Not a checkout route." },
    },
  }),
  evidence("standard-event", 406, {
    event: { name: "shopify:cart:lines-update", phase: "settled" },
  }),
  evidence("buyer.final-answer", 500, { message: "Checkout was never reached." }),
  evidence("buyer.act.end", 501, {
    completed: false,
    reason: "completed",
    summary: "Checkout was never reached.",
  }),
];

async function load(root: string, outputFile = path.join(root, "index.html")) {
  return loadRuns({ inputRoot: root, outputFile });
}

function only(runs: ReportRun[]): ReportRun {
  assert.equal(runs.length, 1, `expected one run, got ${runs.length}`);
  const [run] = runs;
  assert.ok(run !== undefined);
  return run;
}

describe("loadRuns", () => {
  it("loads nested runs, keeps history, and marks the newest run per URL and scenario", async () => {
    const root = await tempRoot();
    await writeRun(path.join(root, "a-old", "run-old"), {
      result: result({ runId: "old", startedAt: "2026-11-04T10:00:00.000Z" }),
      evidence: [],
    });
    await writeRun(path.join(root, "a-new", "run-new"), {
      result: result({
        runId: "new",
        verdict: "pass",
        reason: "All 1 checkpoint(s) passed.",
        errorKind: undefined,
        startedAt: "2026-11-04T11:00:00.000Z",
        // Current results: the configured context. Older ones carry `resolved` or `target.locale`.
        context: { configured: { country: "FR", language: "FR" } },
      }),
      evidence: [],
    });
    await writeRun(path.join(root, "b", "run-b"), {
      result: result({
        runId: "other",
        startedAt: "2026-11-04T09:00:00.000Z",
        target: {
          storefrontUrl: "https://legacy.example/",
          locale: { country: "US", language: "EN" },
        },
        context: undefined,
      }),
      evidence: [],
    });
    // Invocation and log files next to runs are not loaded.
    await writeFile(path.join(root, "a-new", "invocation.json"), "{not json");

    const { runs, warnings } = await load(root);

    assert.deepEqual(warnings, []);
    assert.deepEqual(
      runs.map((run) => [run.id, run.verdict, run.latest]),
      [
        ["new", "pass", true],
        ["old", "indeterminate", false],
        ["other", "indeterminate", true],
      ],
    );
    const [newest, old, other] = runs;
    assert.ok(newest !== undefined && old !== undefined && other !== undefined);
    assert.equal(
      old.reason,
      "The buyer did not complete (completed), but no checkout navigation was captured.",
    );
    assert.equal(old.storeName, "shop.example");
    assert.equal(old.model, "anthropic/model-a");
    assert.deepEqual(newest.context, { country: "FR", language: "FR", configured: true });
    assert.deepEqual(old.context, { country: "CA", language: "EN" });
    assert.deepEqual(other.context, { country: "US", language: "EN" });
    assert.deepEqual(old.pinned, {
      productTitle: "Album",
      variantTitle: "Default Title",
      variantId: "gid://shopify/ProductVariant/1",
      selectedOptions: [{ name: "Title", value: "Default Title" }],
    });
    assert.equal(old.objective, "Add one unit.");
    assert.equal(old.buyerSummary, "Cookie banner blocked checkout.");
    assert.deepEqual(old.checkpoints[0]?.buyer, {
      completed: false,
      reason: "completed",
      summary: "Cookie banner blocked checkout.",
    });
    assert.equal(old.resultHref, "a-old/run-old/result.json");
    assert.equal(old.evidenceHref, "a-old/run-old/evidence.jsonl");
  });

  it("builds the timeline from evidence and links the post-action screenshot", async () => {
    const root = await tempRoot();
    await writeRun(path.join(root, "my run"), {
      evidence: BUYER_EVIDENCE,
      screenshots: ["step-001.png", "step-002.png"],
    });

    const loaded = await load(root);
    const run = only(loaded.runs);

    assert.deepEqual(run.warnings, []);
    assert.deepEqual(run.screenshots, [
      { step: 1, href: "my%20run/step-001.png", summary: "Before: Add one unit.", timestamp: 210 },
      { step: 2, href: "my%20run/step-002.png", summary: "After: act, screenshot", timestamp: 310 },
    ]);
    const byKind = (kind: string) => run.timeline.filter((event) => event.kind === kind);
    const [locale] = byKind("storefront-locale");
    assert.equal(
      locale?.screenshotHref,
      undefined,
      "preflight events are not linked to buyer screenshots",
    );
    assert.equal(
      byKind("storefront-locale-carried-forward")[0]?.title,
      "Storefront locale not set on the page: run context CA/EN carried forward (not confirmed)",
    );
    assert.equal(byKind("buyer.act.start")[0]?.step, 1);
    const [act, screenshot] = byKind("buyer.step");
    assert.equal(act?.title, "Buyer action: act - click Add to cart (failed)");
    assert.equal(act?.summary, "I will add the item.");
    assert.equal(act?.step, 2);
    assert.equal(act?.screenshotHref, "my%20run/step-002.png");
    assert.equal(screenshot?.summary, "I will add the item.", "recorded explanations are kept");
    assert.equal(screenshot?.data.agentText, "I will add the item.");
    // After the last screenshot, events link the latest screenshot before them.
    assert.equal(byKind("buyer.friction")[0]?.step, 2);
    assert.equal(byKind("buyer.final-answer")[0]?.summary, "Checkout was never reached.");
    assert.equal(
      byKind("navigation-blocked")[0]?.summary,
      "top-level frame - https://shop.app/checkout/:n - cart: Not a checkout route.",
    );
    assert.equal(
      byKind("standard-event")[0]?.title,
      "Standard event shopify:cart:lines-update (settled)",
    );
    assert.equal(
      byKind("buyer.act.end")[0]?.title,
      "Buyer stopped (reason: completed, completed: false)",
    );
    assert.deepEqual(
      run.timeline.map((event) => event.timestamp),
      BUYER_EVIDENCE.map((record) => record.timestamp),
    );
    const html = renderReport({ ...loaded, generatedAt: "2026-11-04T00:01:00.000Z" });
    assert.equal(
      html.match(/>I will add the item\.<span class="quote-src">Recorded agent statement/g)?.length,
      1,
    );
    assert.doesNotMatch(html, /class="ev-summary">I will add the item\./);
    assert.match(html, /Buyer action: act - click Add to cart \(failed\)/);
    assert.match(html, /Buyer action: screenshot/);
    assert.match(html, /src="my%20run\/step-001\.png"/);
    assert.match(html, /src="my%20run\/step-002\.png"/);
  });

  it("warns about missing evidence, missing screenshots, and malformed lines, and keeps the run", async () => {
    const root = await tempRoot();
    await writeRun(path.join(root, "no-evidence"), { result: result({ runId: "a" }) });
    await writeRun(path.join(root, "partial"), {
      result: result({ runId: "b", startedAt: "2026-11-04T01:00:00.000Z" }),
      evidence: [
        evidence("buyer.act.start", 1, { objective: "x" }),
        "{not json",
        JSON.stringify({ kind: "buyer.step", timestamp: "soon", data: {} }),
        // `data` must be a string-keyed record, not an array or a scalar.
        JSON.stringify({ kind: "buyer.step", timestamp: 4, data: ["x"] }),
        JSON.stringify({ kind: "buyer.step", timestamp: 5, data: "x" }),
        evidence("screenshot", 2, { step: 1, summary: "Before", screenshot: "step-001.png" }),
        evidence("buyer.act.end", 3, { completed: false, reason: "error", summary: "x" }),
      ],
    });

    const { runs } = await load(root);
    const [partial, missing] = runs;

    assert.equal(missing?.evidenceHref, undefined);
    assert.deepEqual(missing?.timeline, []);
    assert.match(missing?.warnings.join("\n") ?? "", /evidence\.jsonl is missing/);
    assert.equal(partial?.timeline.length, 3);
    assert.deepEqual(partial?.screenshots, []);
    assert.equal(partial?.timeline[1]?.screenshotHref, undefined);
    const text = partial?.warnings.join("\n") ?? "";
    assert.match(text, /line 2 is not a valid evidence record/);
    assert.match(text, /line 3 is not a valid evidence record/);
    assert.match(text, /line 4 is not a valid evidence record/);
    assert.match(text, /line 5 is not a valid evidence record/);
    assert.match(text, /Screenshot step-001\.png is missing/);
  });

  it("skips results with bogus metadata and ignores invalid optional fields", async () => {
    const root = await tempRoot();
    await writeRun(path.join(root, "bad-json"), { result: "{" });
    await writeRun(path.join(root, "bad-verdict"), { result: result({ verdict: "maybe" }) });
    await writeRun(path.join(root, "bad-url"), {
      result: result({ target: { storefrontUrl: "javascript:alert(1)" } }),
    });
    await writeRun(path.join(root, "bad-date"), { result: result({ startedAt: "yesterday" }) });
    await writeRun(path.join(root, "loose"), {
      result: result({
        runId: "loose",
        pinned: { productTitle: 1 },
        metadata: { buyer: "x" },
        durationMs: -5,
        checkpoints: [{ name: "broken" }],
      }),
      evidence: [],
    });

    const { runs, warnings } = await load(root);
    const run = only(runs);

    assert.equal(run.id, "loose");
    assert.equal(run.pinned, undefined);
    assert.equal(run.model, undefined);
    assert.equal(run.durationMs, 0);
    assert.deepEqual(run.checkpoints, []);
    assert.match(run.warnings.join("\n"), /Ignored checkpoint 1/);
    assert.equal(warnings.length, 4);
    for (const name of ["bad-json", "bad-verdict", "bad-url", "bad-date"]) {
      assert.ok(
        warnings.some((warning) => warning.startsWith(`Skipped ${name}/result.json`)),
        `missing warning for ${name}: ${warnings.join(" | ")}`,
      );
    }
  });

  it("does not follow symlinks or leave the input root", async () => {
    const outside = await tempRoot();
    await writeRun(path.join(outside, "secret-run"), {
      result: result({ runId: "outside" }),
      evidence: [],
    });
    await writeFile(path.join(outside, "step-009.png"), PNG);

    const root = await tempRoot();
    await symlink(path.join(outside, "secret-run"), path.join(root, "linked-dir"));
    const linkedFiles = path.join(root, "linked-files");
    await mkdir(linkedFiles);
    await symlink(
      path.join(outside, "secret-run", "result.json"),
      path.join(linkedFiles, "result.json"),
    );
    await writeRun(path.join(root, "run"), {
      result: result({ runId: "inside" }),
      evidence: [
        evidence("screenshot", 1, { step: 1, summary: "escape", screenshot: "../../step-009.png" }),
        evidence("screenshot", 2, { step: 2, summary: "url", screenshot: "javascript:alert(1)" }),
        evidence("screenshot", 3, { step: 3, summary: "link", screenshot: "step-003.png" }),
      ],
    });
    await symlink(path.join(outside, "step-009.png"), path.join(root, "run", "step-003.png"));
    const evidenceLinkRun = path.join(root, "evidence-link");
    await writeRun(evidenceLinkRun, { result: result({ runId: "evidence-link" }) });
    await symlink(
      path.join(outside, "secret-run", "evidence.jsonl"),
      path.join(evidenceLinkRun, "evidence.jsonl"),
    );

    const { runs, warnings } = await load(root);

    assert.deepEqual(runs.map((run) => run.id).toSorted(), ["evidence-link", "inside"]);
    assert.match(warnings.join("\n"), /Skipped linked-dir: symbolic links are not followed/);
    assert.match(warnings.join("\n"), /Skipped linked-files\/result\.json/);
    const inside = runs.find((run) => run.id === "inside");
    assert.deepEqual(inside?.screenshots, []);
    assert.equal(
      inside?.timeline.some((event) => event.screenshotHref !== undefined),
      false,
    );
    assert.equal(runs.find((run) => run.id === "evidence-link")?.evidenceHref, undefined);
    for (const run of runs) {
      assert.doesNotMatch(JSON.stringify(run), /\/etc|secret-run|\.\.\/\.\.\/secret/);
    }
  });

  it("keeps script-like model text as plain data", async () => {
    const root = await tempRoot();
    const payload = `<script>alert("x")</script><img src=x onerror=alert(1)>`;
    await writeRun(path.join(root, "run"), {
      result: result({ reason: payload }),
      evidence: [evidence("buyer.final-answer", 1, { message: payload })],
    });

    const run = only((await load(root)).runs);

    assert.equal(run.reason, payload);
    assert.equal(run.timeline[0]?.summary, payload);
    assert.equal(run.timeline[0]?.data.message, payload);
  });

  it("preserves saved text, cart IDs, checkout URLs, and token-like fields", async () => {
    const root = await tempRoot();
    const text = "sk-owner-debug-text-123456";
    await writeRun(path.join(root, "run"), {
      result: result({ reason: `saved text ${text}` }),
      evidence: [
        evidence("buyer.step", 1, {
          action: "act",
          args: { action: `type ${text}` },
          ok: true,
          agentText: "Cart gid://shopify/Cart/abc123?key=secretvalue",
        }),
        evidence("checkout", 2, {
          url: "https://c.example/cart/c/tokentoken?key=k",
          cartId: "gid://shopify/Cart/zzz",
          token: "owner-debug-value",
        }),
      ],
    });

    const { runs } = await loadRuns({
      inputRoot: root,
      outputFile: path.join(root, "index.html"),
    });
    const serialized = JSON.stringify(runs);

    for (const value of [text, "abc123?key=secretvalue", "tokentoken?key=k", "owner-debug-value"]) {
      assert.ok(serialized.includes(value), value);
    }
    assert.equal(only(runs).timeline[1]?.data.cartId, "gid://shopify/Cart/zzz");
  });

  it("makes hrefs relative to an output outside the input tree", async () => {
    const base = await tempRoot();
    const root = path.join(base, "in put");
    await writeRun(path.join(root, "run#1"), {
      evidence: [evidence("screenshot", 1, { step: 1, summary: "s", screenshot: "step-001.png" })],
      screenshots: ["step-001.png"],
    });
    await mkdir(path.join(base, "out"));

    const run = only((await load(root, path.join(base, "out", "report.html"))).runs);

    assert.equal(run.resultHref, "../in%20put/run%231/result.json");
    assert.equal(run.screenshots[0]?.href, "../in%20put/run%231/step-001.png");
  });

  it("warns when a bound truncates the report", async () => {
    const root = await tempRoot();
    for (const name of ["r1", "r2", "r3"]) {
      await writeRun(path.join(root, name), {
        result: result({ runId: name }),
        evidence: [evidence("a", 1, {}), evidence("b", 2, {}), evidence("c", 3, {})],
      });
    }

    const { runs, warnings } = await loadRuns({
      inputRoot: root,
      outputFile: path.join(root, "index.html"),
      limits: { maxRuns: 2, maxEvidenceLines: 2 },
    });

    assert.equal(runs.length, 2);
    assert.match(warnings.join("\n"), /Found 3 runs/);
    assert.equal(runs[0]?.timeline.length, 2);
    assert.match(runs[0]?.warnings.join("\n") ?? "", /timeline is truncated/);
  });

  it("warns when the input has no runs", async () => {
    const root = await tempRoot();
    const { runs, warnings } = await load(root);
    assert.deepEqual(runs, []);
    assert.deepEqual(warnings, ["No result.json files were found under the input directory."]);
  });
});

describe("helpers", () => {
  it("names a store by hostname without www", () => {
    assert.equal(storeName("https://www.shop.example/path"), "shop.example");
    assert.equal(storeName("https://skeleton.hydrogen.shop/"), "skeleton.hydrogen.shop");
  });

  it("encodes each href path segment", () => {
    assert.equal(toHref("/a/out", "/a/in dir/x?y.png"), "../in%20dir/x%3Fy.png");
  });
});
