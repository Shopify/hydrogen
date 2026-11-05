import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type Locator, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { renderReport } from "./render.ts";
import type { ReportDocument, ReportEvent, ReportRun } from "./view-model.ts";

// Real headless Chromium on a generated report under file://. Local fixture files only.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const KNOWN_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

// A 2x2 opaque PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

// Each payload sets a flag if it ever runs.
const PAYLOAD = `<img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script></script><svg onload="window.__pwned=3">\u2028`;

const START = Date.parse("2026-11-04T16:00:00.000Z");

function event(
  index: number,
  overrides: Partial<ReportEvent> & Pick<ReportEvent, "kind">,
): ReportEvent {
  return {
    id: `e${index}`,
    timestamp: START + index * 1000,
    title: overrides.kind,
    data: {},
    ...overrides,
  };
}

function baseRun(overrides: Partial<ReportRun>): ReportRun {
  return {
    id: "r",
    storeName: "store",
    storefrontUrl: "https://store.example/",
    scenario: "add-to-cart",
    verdict: "pass",
    reason: "All 1 checkpoint(s) passed.",
    startedAt: new Date(START).toISOString(),
    durationMs: 11_100,
    context: { country: "US", language: "EN" },
    timeline: [],
    screenshots: [],
    checkpoints: [],
    warnings: [],
    resultHref: "runs/a/result.json",
    latest: true,
    ...overrides,
  };
}

function fixtureDocument(): ReportDocument {
  const shots = [1, 2, 3].map((step) => ({
    step,
    href: `runs/a/step-00${step}.png`,
    summary: `After step ${step} ${PAYLOAD}`,
    timestamp: START + step * 1000,
  }));
  return {
    generatedAt: new Date(START + 3_600_000).toISOString(),
    warnings: [PAYLOAD],
    runs: [
      baseRun({
        id: "a",
        storeName: `Indeterminate store ${PAYLOAD}`,
        verdict: "indeterminate",
        reason: `Cookie banner blocked checkout ${PAYLOAD}`,
        buyerSummary: `I could not reach checkout ${PAYLOAD}`,
        evidenceHref: "runs/a/evidence.jsonl",
        screenshots: [
          ...shots,
          { step: 4, href: "runs/a/missing.png", summary: "Missing file", timestamp: START + 4000 },
        ],
        timeline: [
          event(1, {
            kind: "buyer.step",
            title: "Look",
            screenshotHref: shots[0]?.href,
            step: 1,
            data: { action: "ariaTree", ok: true },
          }),
          event(2, {
            kind: "buyer.step",
            title: "Click",
            screenshotHref: shots[1]?.href,
            step: 2,
            data: { action: "act", ok: false, agentText: `Dismiss banner ${PAYLOAD}` },
          }),
          event(3, {
            kind: "buyer.friction",
            title: "Friction",
            data: { message: `Banner overlaps ${PAYLOAD}` },
          }),
          event(4, { kind: "mystery.kind", title: PAYLOAD, data: { [PAYLOAD]: PAYLOAD } }),
        ],
        checkpoints: [
          { name: "cp", verdict: "indeterminate", reason: PAYLOAD, objective: PAYLOAD },
        ],
      }),
      baseRun({
        id: "b",
        storeName: "Pass store",
        storefrontUrl: "https://pass.example/",
        checkpoints: [
          {
            name: "cp",
            verdict: "pass",
            reason: "Cart ok",
            objective: "o",
            details: { expectedVariantId: "gid://1", totalQuantity: 1 },
          },
        ],
      }),
      baseRun({
        id: "c",
        storeName: "Pass store",
        storefrontUrl: "https://pass.example/",
        verdict: "indeterminate",
        reason: "Older harness issue",
        latest: false,
        startedAt: new Date(START - 3_600_000).toISOString(),
      }),
    ],
  };
}

function resolveExecutable(): string {
  const configured = process.env.PLAYWRIGHT_BROWSER_EXECUTABLE_PATH;
  if (configured !== undefined && configured !== "") return configured;
  const found = [chromium.executablePath(), ...KNOWN_CHROME_PATHS].find((path) => existsSync(path));
  if (found === undefined)
    throw new Error("No Chromium found. Set PLAYWRIGHT_BROWSER_EXECUTABLE_PATH.");
  return found;
}

let browser: Browser;
let workDir: string;
let reportUrl: string;

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "storefront-e2e-report-test-"));
  await mkdir(join(workDir, "runs/a"), { recursive: true });
  for (const step of [1, 2, 3]) await writeFile(join(workDir, `runs/a/step-00${step}.png`), PNG);
  await writeFile(join(workDir, "runs/a/result.json"), "{}");
  await writeFile(join(workDir, "index.html"), renderReport(fixtureDocument()));
  reportUrl = pathToFileURL(join(workDir, "index.html")).href;
  browser = await chromium.launch({ executablePath: resolveExecutable(), headless: true });
});

afterAll(async () => {
  await browser?.close();
  if (workDir !== undefined) await rm(workDir, { recursive: true, force: true });
});

type Watched = { page: Page; problems: string[] };

async function open(
  options: { width?: number; height?: number; javaScriptEnabled?: boolean } = {},
): Promise<Watched> {
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1280, height: options.height ?? 900 },
    javaScriptEnabled: options.javaScriptEnabled ?? true,
  });
  const page = await context.newPage();
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("dialog", (dialog) => {
    problems.push(`dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  page.on("request", (request) => {
    if (!request.url().startsWith("file:")) problems.push(`request: ${request.url()}`);
  });
  await page.goto(reportUrl);
  return { page, problems };
}

const activePanel = (page: Page) => page.locator("[data-run-panel]:visible");

// Small polling helpers: vitest's expect has no Playwright locator matchers.
const visible = (locator: Locator) => expect.poll(async () => locator.isVisible());
const count = (locator: Locator) => expect.poll(async () => locator.count());
const text = (locator: Locator) =>
  expect.poll(async () => (await locator.first().textContent()) ?? "");
const attribute = (locator: Locator, name: string) =>
  expect.poll(async () => locator.getAttribute(name));
const focused = (locator: Locator) =>
  expect.poll(async () => locator.evaluate((element) => element === document.activeElement));
const allHidden = (locator: Locator) =>
  expect.poll(async () =>
    locator.evaluateAll((elements) => elements.every((element) => !element.checkVisibility())),
  );

describe("report page in a browser", () => {
  it("never runs injected markup and makes no network requests", async () => {
    const { page, problems } = await open();
    await page.locator("details.earlier summary").click();
    for (const tab of await page.getByRole("tab").all()) await tab.click();
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => (window as { __pwned?: number }).__pwned)).toBeUndefined();
    expect(await page.locator("body script, [onerror], [onload]").count()).toBe(0);
    await count(page.getByText("Indeterminate store <img src=x").first()).toBeGreaterThan(0);
    expect(problems).toEqual([]);
    await page.context().close();
  });

  it("opens on the run that needs review and switches runs by click and keyboard", async () => {
    const { page, problems } = await open();
    await count(activePanel(page)).toBe(1);
    await text(activePanel(page).getByRole("heading", { level: 2 })).toContain(
      "Indeterminate store",
    );
    await text(activePanel(page)).toContain("Not a failure");

    await page.getByRole("tab", { name: /Pass store/ }).click();
    await text(activePanel(page).getByRole("heading", { level: 2 })).toBe("Pass store");
    await attribute(page.getByRole("tab", { name: /Pass store/ }), "aria-selected").toBe("true");

    await page.keyboard.press("ArrowUp");
    await text(activePanel(page).getByRole("heading", { level: 2 })).toContain(
      "Indeterminate store",
    );
    await attribute(page.locator(":focus"), "aria-selected").toBe("true");
    expect(problems).toEqual([]);
    await page.context().close();
  });

  it("shows earlier attempts apart and opens them from the attempt list", async () => {
    const { page } = await open();
    await page
      .getByRole("tab", { name: /Pass store/ })
      .first()
      .click();
    await activePanel(page)
      .getByRole("link", { name: /Indeterminate.*UTC/ })
      .click();
    await text(activePanel(page)).toContain("Earlier attempt. Not counted in the totals.");
    await attribute(page.locator("details.earlier"), "open").toBe("");
    await text(page.locator(".tally")).toContain("1 earlier attempt not counted.");
    await attribute(page.locator(":focus"), "data-run-heading").toBe("");
    await page.context().close();
  });

  it("enlarges screenshots, moves with arrows, closes with Escape, and returns focus", async () => {
    const { page, problems } = await open();
    const thumb = activePanel(page).locator(".filmstrip [data-shot]").nth(1);
    await thumb.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await visible(dialog).toBe(true);
    await text(dialog.getByRole("heading")).toContain("Step 2");
    await focused(dialog.getByRole("button", { name: /Close/ })).toBe(true);
    await text(dialog.locator("[data-lightbox-caption]")).toContain("<img src=x");
    await attribute(dialog.locator("img"), "alt").toMatch(/Screenshot at step 2/);

    await page.keyboard.press("ArrowRight");
    await text(dialog.getByRole("heading")).toContain("Step 3");
    await dialog.getByRole("button", { name: "Previous screenshot" }).click();
    await text(dialog.getByRole("heading")).toContain("Step 2");

    await page.keyboard.press("Escape");
    await visible(dialog).toBe(false);
    await focused(thumb).toBe(true);
    expect(problems).toEqual([]);
    await page.context().close();
  });

  it("marks missing screenshot files instead of showing a broken image", async () => {
    const { page } = await open();
    await count(activePanel(page).locator(".filmstrip .shot-frame.is-missing")).toBe(1);
    await page.context().close();
  });

  it("filters the decision trace to key moments", async () => {
    const { page } = await open();
    const trace = activePanel(page).locator(".trace");
    await allHidden(trace.locator(".ev.is-routine")).toBe(true);
    await visible(trace.getByText("Recorded agent statement").first()).toBe(true);
    await trace.getByLabel("Show key moments only").uncheck();
    await allHidden(trace.locator(".ev.is-routine")).toBe(false);
    await page.context().close();
  });

  it("shows every run without JavaScript", async () => {
    const { page } = await open({ javaScriptEnabled: false });
    await count(page.locator("[data-run-panel]:visible")).toBe(3);
    await page.context().close();
  });

  it("fits a phone screen without sideways scrolling", async () => {
    const { page, problems } = await open({ width: 375, height: 812 });
    await page.getByRole("tab", { name: /Pass store/ }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
    await page.context().close();
  });
});
