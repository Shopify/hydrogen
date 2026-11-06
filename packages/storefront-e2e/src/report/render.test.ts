import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { escapeHtml, renderReport, safeExternalHref, safeLocalHref } from "./render.ts";
import type { ReportDocument, ReportEvent, ReportRun } from "./view-model.ts";

const XSS = `<img src=x onerror="alert(1)"></script><script>alert(2)</script>\u2028'"&`;

function run(overrides: Partial<ReportRun> = {}): ReportRun {
  return {
    id: "run-a",
    storeName: "store-a.example",
    storefrontUrl: "https://store-a.example/",
    scenario: "add-to-cart",
    verdict: "pass",
    reason: "All 1 checkpoint(s) passed.",
    startedAt: "2026-11-04T16:00:00.000Z",
    durationMs: 11_100,
    model: "provider/model",
    context: { country: "US", language: "EN" },
    timeline: [],
    screenshots: [],
    checkpoints: [],
    warnings: [],
    resultHref: "a/result.json",
    evidenceHref: "a/evidence.jsonl",
    latest: true,
    ...overrides,
  };
}

function event(overrides: Partial<ReportEvent> & Pick<ReportEvent, "kind">): ReportEvent {
  return {
    id: `e-${Math.random()}`,
    timestamp: Date.parse("2026-11-04T16:00:01.000Z"),
    title: overrides.kind,
    data: {},
    ...overrides,
  };
}

function doc(runs: ReportRun[], warnings: string[] = []): ReportDocument {
  return { generatedAt: "2026-11-04T17:00:00.000Z", runs, warnings };
}

function between(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  if (from === -1) throw new Error(`Missing ${start}`);
  const to = html.indexOf(end, from);
  if (to === -1) throw new Error(`Missing ${end} after ${start}`);
  return html.slice(from, to);
}

function panel(html: string, index: number): string {
  return between(html, `id="run-${index}" data-run-panel`, "</article>");
}

describe("renderReport", () => {
  it("returns one self-contained HTML page with a strict hash-based CSP", () => {
    const html = renderReport(doc([run()]));
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html.match(/<style/g)).toHaveLength(1);
    expect(html).not.toMatch(/<link\b|@import|https?:\/\/fonts|src="https?:/);

    const script = between(html, "<script>", "</script>").slice("<script>".length);
    const style = between(html, "<style>", "</style>").slice("<style>".length);
    const hash = (value: string) =>
      `sha256-${createHash("sha256").update(value, "utf8").digest("base64")}`;
    const csp = between(html, 'http-equiv="Content-Security-Policy" content="', '">');
    expect(csp).toContain("default-src &#39;none&#39;");
    expect(csp).toContain(`script-src &#39;${hash(script)}&#39;`);
    expect(csp).toContain(`style-src &#39;${hash(style)}&#39;`);
    expect(csp).not.toContain("unsafe-inline");
  });

  it("escapes untrusted store, agent, and artifact text everywhere", () => {
    const html = renderReport(
      doc(
        [
          run({
            storeName: XSS,
            reason: XSS,
            scenario: XSS,
            model: XSS,
            context: { country: XSS, language: XSS, mismatch: XSS },
            pinned: {
              productTitle: XSS,
              variantTitle: XSS,
              variantId: XSS,
              selectedOptions: [{ name: XSS, value: XSS }],
            },
            objective: XSS,
            buyerSummary: XSS,
            warnings: [XSS],
            timeline: [
              event({ kind: XSS, title: XSS, summary: XSS, data: { [XSS]: XSS } }),
              event({ kind: "buyer.step", title: XSS, data: { action: "act", agentText: XSS } }),
              event({ kind: "buyer.friction", title: XSS, data: { message: XSS, url: XSS } }),
            ],
            screenshots: [{ step: 1, href: "a/step-001.png", summary: XSS, timestamp: 0 }],
            checkpoints: [
              {
                name: XSS,
                verdict: XSS,
                reason: XSS,
                objective: XSS,
                buyer: { completed: false, reason: XSS, summary: `${XSS} other` },
                details: { [XSS]: XSS, nested: [{ [XSS]: XSS }] },
              },
            ],
          }),
        ],
        [XSS],
      ),
    );
    const body = html.slice(html.indexOf("</head>"));
    expect(body).not.toContain("<script");
    expect(body).not.toContain("<img src=x");
    expect(body).not.toContain('onerror="');
    expect(body).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(body).toContain("&lt;/script&gt;&lt;script&gt;alert(2)&lt;/script&gt;");
  });

  it("only links safe local paths and http(s) storefront URLs", () => {
    const html = renderReport(
      doc([
        run({
          storefrontUrl: "javascript:alert(1)",
          resultHref: "javascript:alert(1)",
          evidenceHref: "//evil.example/evidence.jsonl",
          screenshots: [
            { step: 1, href: "data:image/png;base64,AAAA", summary: "one", timestamp: 0 },
            { step: 2, href: "../ok/step-002.png", summary: "two", timestamp: 0 },
          ],
        }),
      ]),
    );
    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).not.toMatch(/(?:href|src)="(?:data:|\/\/)/i);
    expect(html).toContain("Result file not available");
    expect(html).toContain("Evidence file not available");
    expect(html).toContain("Step 1: image link not available");
    expect(html).toContain('href="../ok/step-002.png"');
    expect(html).not.toContain('href="javascript:alert(1)" target');
  });

  it("counts only latest runs and lists earlier attempts apart", () => {
    const html = renderReport(
      doc([
        run({
          id: "old-1",
          verdict: "indeterminate",
          latest: false,
          startedAt: "2026-11-04T15:00:00Z",
        }),
        run({
          id: "old-2",
          verdict: "indeterminate",
          latest: false,
          startedAt: "2026-11-04T15:30:00Z",
        }),
        run({ id: "new", verdict: "pass" }),
        run({
          id: "b",
          storeName: "store-b",
          storefrontUrl: "https://b.example/",
          verdict: "indeterminate",
        }),
      ]),
    );
    const tally = between(html, '<section class="tally"', "</section>");
    expect(tally).toContain("Latest result for each store and test: 2");
    expect(tally).toContain("<b>1</b>indeterminate");
    expect(tally).toContain("<b>1</b>pass");
    expect(tally).toContain("2 earlier attempts not counted.");
    expect(between(html, '<details class="earlier"', "</details>")).toContain(
      "Earlier attempts (2)",
    );
    expect(panel(html, 0)).toContain("Earlier attempt. Not counted in the totals.");
    expect(panel(html, 2)).toContain("All attempts (3):");
  });

  it("selects the first latest run that needs review by default", () => {
    const html = renderReport(
      doc([
        run({ id: "p", storeName: "a-pass", verdict: "pass" }),
        run({
          id: "i",
          storeName: "z-indeterminate",
          storefrontUrl: "https://z/",
          verdict: "indeterminate",
        }),
      ]),
    );
    expect(html).toContain('id="run-1" data-run-panel="1" role="tabpanel"');
    expect(html).toMatch(/class="run-panel is-active" id="run-1"/);
    expect(html).toMatch(/id="tab-1"[^>]*aria-selected="true"/);
    expect(html).toMatch(/id="tab-0"[^>]*aria-selected="false"/);
    const rail = between(html, '<nav class="rail"', "</nav>");
    expect(rail.indexOf("z-indeterminate")).toBeLessThan(rail.indexOf("a-pass"));
  });

  it("labels a configured context as not checked in the browser, and an older one as frozen", () => {
    const configured = renderReport(
      doc([run({ context: { country: "CA", language: "EN", configured: true } })]),
    );
    expect(configured).toContain("CA / EN (configured, not checked in the browser)");
    expect(renderReport(doc([run()]))).toContain("US / EN (frozen at the start)");
  });

  it("explains indeterminate as not a failure and shows the reason without a cause row", () => {
    const html = renderReport(doc([run({ verdict: "indeterminate", reason: "Cookie banner." })]));
    const verdict = between(html, '<section class="verdict', "</section>");
    expect(verdict).toContain("Not a failure");
    expect(verdict).toContain("Cookie banner.");
    expect(verdict).not.toContain("verdict-cause");
    expect(verdict).not.toContain("<dt>Cause</dt>");
  });

  it("labels agent statements as recorded text and never as private reasoning", () => {
    const html = renderReport(
      doc([
        run({
          verdict: "indeterminate",
          buyerSummary: "I could not reach checkout.",
          timeline: [
            event({
              kind: "buyer.step",
              summary: "Same",
              data: { action: "act", agentText: "Same", ok: false },
            }),
            event({
              kind: "buyer.step",
              summary: "Same",
              data: { action: "screenshot", agentText: "Same", ok: true },
            }),
            event({ kind: "buyer.friction", data: { message: "Banner blocks checkout." } }),
            event({ kind: "buyer.final-answer", data: { message: "I could not reach checkout." } }),
          ],
        }),
      ]),
    );
    expect(html).toContain("Recorded agent explanation");
    expect(html).toContain("Decision trace");
    expect(html).toContain("This is not hidden or private reasoning.");
    expect(html).toContain("Final answer saved by the agent");
    expect(between(html, '<ul class="friction">', "</ul>")).toContain("Banner blocks checkout.");
    // The same statement on two tool calls of one turn is quoted once.
    expect(html.match(/>Same<span class="quote-src">Recorded agent statement/g)).toHaveLength(1);
    expect(html).toContain("Did not work");
  });

  it("shows a runner note instead of an agent quote when the runner stopped the agent", () => {
    const html = renderReport(
      doc([
        run({
          buyerSummary: "The runner stopped the buyer.",
          checkpoints: [
            {
              name: "cp",
              verdict: "pass",
              reason: "ok",
              objective: "o",
              buyer: {
                completed: false,
                reason: "aborted",
                summary: "The runner stopped the buyer.",
              },
              details: { expectedVariantId: "gid://1", totalQuantity: 1 },
            },
          ],
        }),
      ]),
    );
    expect(html).toContain("The agent gave no final answer because the runner stopped it.");
    expect(html).not.toContain("Final answer saved by the agent");
    expect(html).toContain("The runner stopped the agent.");
  });

  it("renders checkpoint details as a table plus raw JSON, and flags missing checks", () => {
    const html = renderReport(
      doc([
        run({
          checkpoints: [
            {
              name: "verified",
              verdict: "pass",
              reason: "ok",
              objective: "o",
              details: {
                expectedVariantId: "gid://1",
                lines: [{ quantity: 1, variantId: "gid://1" }],
                context: { cartCountryConfirmed: true },
              },
            },
            { name: "unverified", verdict: "indeterminate", reason: "no token", objective: "o" },
          ],
        }),
      ]),
    );
    expect(html).toMatch(
      /<tr class="is-expected"><th scope="row">expectedVariantId<\/th><td>gid:\/\/1/,
    );
    expect(html).toContain('<th scope="row">lines[0].quantity</th><td>1</td>');
    expect(html).toContain('<span class="bool-true">true</span>');
    expect(html).toContain("Show raw check data (JSON)");
    expect(html).toContain("Not verified:");
  });

  it("acknowledges empty evidence, screenshots, checks, and warnings", () => {
    const html = renderReport(
      doc([run({ warnings: ["Closing the buyer failed."] })], ["Bad file."]),
    );
    expect(html).toContain("No screenshots were saved for this run.");
    expect(html).toContain("No evidence was recorded for this run.");
    expect(html).toContain("No checkpoint ran.");
    expect(html).toContain("The agent saved no final answer.");
    expect(html).toContain("Run warnings (1)");
    expect(html).toContain("Report warnings (1)");
  });

  it("renders an empty state when there are no runs", () => {
    const html = renderReport(doc([]));
    expect(html).toContain("No runs found");
    expect(html).toContain("No latest results");
  });

  it("does not crash on unknown kinds, verdicts, or prototype-like keys", () => {
    const html = renderReport(
      doc([
        run({
          verdict: "constructor" as ReportRun["verdict"],
          reason: "__proto__",
          timeline: [event({ kind: "mystery.kind", title: "", data: { a: 1n.toString() } })],
          checkpoints: [
            {
              name: "c",
              verdict: "toString",
              reason: "r",
              objective: "o",
              buyer: { completed: true, reason: "constructor", summary: "" },
            },
          ],
        }),
      ]),
    );
    expect(html).toContain("mystery.kind");
    expect(panel(html, 0)).toContain('<p class="verdict-reason">__proto__</p>');
    expect(html).toContain("badge v-unknown");
  });

  it("collapses identical back-to-back runner records and counts every event", () => {
    const warning = { kind: "recorder-error", title: "Recorder warning", summary: "Late." };
    const html = renderReport(
      doc([
        run({
          timeline: [event(warning), event(warning), event(warning), event({ kind: "screenshot" })],
        }),
      ]),
    );
    expect(html.match(/>Recorder warning</g)).toHaveLength(1);
    expect(html).toContain("Recorded 3 times");
    expect(html).toContain("Showing 3 of 4 events.");
  });

  it("links timeline screenshots to the filmstrip once per image", () => {
    const shot = { step: 2, href: "a/step-002.png", summary: "After act", timestamp: 0 };
    const html = renderReport(
      doc([
        run({
          screenshots: [shot],
          timeline: [
            event({ kind: "buyer.step", screenshotHref: shot.href, data: { action: "ariaTree" } }),
            event({
              kind: "buyer.step",
              screenshotHref: shot.href,
              data: { action: "act", agentText: "Go" },
            }),
            event({ kind: "screenshot", screenshotHref: shot.href, data: {} }),
          ],
        }),
      ]),
    );
    const timeline = between(html, '<ol class="timeline">', "</ol>");
    expect(timeline.match(/data-shot-index="0"/g)).toHaveLength(1);
    expect(between(timeline, "Go<span", "</li>")).toContain('data-shot-index="0"');
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});

describe("safeLocalHref", () => {
  it.each(["step-001.png", "run/a%20b/step.png", "../../x/result.json"])("keeps %s", (href) => {
    expect(safeLocalHref(href)).toBe(href);
  });

  it.each([
    "",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,x",
    "file:///etc/passwd",
    "https://evil.example/x.png",
    "//evil.example/x.png",
    "/etc/passwd",
    "a\\b.png",
    "a b.png",
    "a\nb.png",
    undefined,
  ])("rejects %j", (href) => {
    expect(safeLocalHref(href)).toBeUndefined();
  });
});

describe("safeExternalHref", () => {
  it("keeps http and https URLs", () => {
    expect(safeExternalHref("https://shop.example/")).toBe("https://shop.example/");
    expect(safeExternalHref("http://shop.example")).toBe("http://shop.example/");
  });

  it.each(["javascript:alert(1)", "file:///x", "ftp://x", "https://user:pw@x.example/", "nope"])(
    "rejects %s",
    (value) => {
      expect(safeExternalHref(value)).toBeUndefined();
    },
  );
});
