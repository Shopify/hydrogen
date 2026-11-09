// Frame capability proof for real Stagehand 3.7.3 on a real BrowserSession.
//
// Fixture: a main page on http://127.0.0.1:<port>, a cross-site child iframe on
// http://localhost:<port> (an out-of-process frame), and a nested iframe inside the
// child, on http://[::1]:<port> (a third site) or back on http://127.0.0.1:<port>
// (A-B-A). Each document has one button and records trusted clicks. The frames and
// buttons sit far from the origin, and the main page and the child frame are scrolled
// first, so a coordinate bug lands on the wrong spot.
//
// The production path is `prepareStagehandSession` on the blank browser, then the page
// load, then the buyer on the same instance. The checks use the same non-inference path as
// Stagehand's `act` after a model has chosen an element: `page.snapshot()` gives the
// element ID and its deep XPath, and `page.deepLocator("xpath=...").click()` resolves the
// frame and dispatches CDP mouse input. No model is called: the provider variables point at
// a local endpoint that refuses every request and must receive none. Model element
// selection is not part of this proof.
//
// Known Stagehand 3.7.3 gaps are kept as `it.fails` tests, so an SDK upgrade that fixes
// one turns it red and forces a review:
// 1. Out-of-process frames that already exist when Stagehand attaches are never adopted
//    (the reason the buyer attaches before the first navigation). Reproduced with a raw
//    Stagehand attach after the page loaded, independent of our session code.
// 2. A-B-A: a nested frame on the top page's site inside a cross-site frame is never
//    adopted, even with the early attach. Not fixed here.
// In both cases the snapshot does not list the frame, and `deepLocator` cannot reach it.
//
// Readiness: Playwright reports a frame loaded before Stagehand has necessarily adopted its
// target (adoption runs on Stagehand's own CDP events). So every case first polls
// `page.snapshot()` until it lists all three fixture buttons, within READINESS_DEADLINE_MS.
// The positive cases then assert on that snapshot. The SDK gap cases get the same full
// deadline in their snapshot test and must still miss exactly the expected buttons.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Stagehand } from "@browserbasehq/stagehand";
import type { Frame } from "playwright-core";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserSession, type BrowserSession } from "../browser/session.ts";
import { createStagehandBuyer } from "./stagehand-buyer.ts";
import { prepareStagehandSession, type StagehandSession } from "./stagehand-session.ts";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 30_000 });

const TRAP_API_KEY = "sk-trap-frames-key-000000000000";
/** Cleared for every test, so no inherited credential, endpoint, or flow log is used. */
const CLEARED_ENV = [
  "AGENTIC_E2E_API_KEY",
  "AGENTIC_E2E_BASE_URL",
  "AGENTIC_E2E_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "SHOPIFY_PROXY_KEY",
  "BRAVE_API_KEY",
  "BROWSERBASE_CONFIG_DIR",
  "BROWSERBASE_FLOW_LOGS",
];

type FrameName = "main" | "child" | "nested";
const FRAMES: Record<FrameName, { path: string; label: string }> = {
  main: { path: "/", label: "Main action" },
  child: { path: "/child", label: "Child continue" },
  nested: { path: "/nested", label: "Nested continue" },
};
const FRAME_NAMES: readonly FrameName[] = ["main", "child", "nested"];

/** Upper bound for Stagehand to list every fixture button after the frames loaded. */
const READINESS_DEADLINE_MS = 5_000;
/**
 * Shorter bound for the SDK gap click tests. The matching snapshot test in the same block
 * shows with the full deadline that the gap does not converge; the click tests only check
 * which layer then fails.
 */
const GAP_CLICK_READINESS_MS = 1_000;
const READINESS_POLL_GAP_MS = 50;

/**
 * Where the nested frame lives. `third-site` is a third site ([::1]); `top-site`
 * is the main page's site (127.0.0.1), an A-B-A frame chain. Both are separate
 * out-of-process targets, because each differs from its parent's site.
 */
type Layout = "third-site" | "top-site";
const LAYOUTS: readonly Layout[] = ["third-site", "top-site"];
const NESTED_HOST: Record<Layout, string> = { "third-site": "[::1]", "top-site": "127.0.0.1" };

/**
 * `early`: the production `prepareStagehandSession` before the first navigation.
 * `late-raw`: a raw Stagehand attach after the page loaded (SDK gap reproduction only).
 */
type Attach = "early" | "late-raw";

type ClickRecord = { trusted: boolean; x: number; y: number };
type MissRecord = { tag: string; id: string; x: number; y: number };
type FixtureState = { clicks: ClickRecord[]; misses: MissRecord[]; messages: unknown[] };
type StagehandPage = ReturnType<Stagehand["context"]["pages"]>[number];
type Snapshot = Awaited<ReturnType<StagehandPage["snapshot"]>>;
type Opened = { session: BrowserSession; page: StagehandPage; prepared?: StagehandSession };

let fixture: { server: Server; port: number };
let model: { server: Server; origin: string };
const modelRequests: string[] = [];
let workDir: string;
const cleanup: Array<() => Promise<unknown>> = [];

beforeAll(async () => {
  const fixtureServer = createServer(fixtureRoutes);
  fixture = { server: fixtureServer, port: await listen(fixtureServer, "::") };
  // Any request here would be a model call. It is recorded and refused.
  const modelServer = createServer((request, response) => {
    modelRequests.push(`${request.method ?? "?"} ${request.url ?? "/"}`);
    response.writeHead(500).end();
  });
  model = { server: modelServer, origin: `http://127.0.0.1:${await listen(modelServer)}` };
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-frames-test-"));
});

beforeEach(() => {
  for (const name of CLEARED_ENV) vi.stubEnv(name, undefined);
  // Stagehand's default model client may read these. They point at the refusing endpoint.
  vi.stubEnv("OPENAI_API_KEY", TRAP_API_KEY);
  vi.stubEnv("OPENAI_BASE_URL", `${model.origin}/v1`);
  vi.stubEnv("ANTHROPIC_API_KEY", TRAP_API_KEY);
  vi.stubEnv("ANTHROPIC_BASE_URL", `${model.origin}/v1`);
});

afterEach(async () => {
  for (const step of cleanup.splice(0).toReversed()) await step().catch(() => undefined);
  vi.unstubAllEnvs();
  expect(modelRequests).toEqual([]);
  modelRequests.length = 0;
});

afterAll(async () => {
  for (const server of [fixture.server, model.server]) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await rm(workDir, { recursive: true, force: true });
});

describe.each(LAYOUTS)(
  "frame fixture controls, nested on %s (Playwright; not under test)",
  (layout) => {
    it("records one trusted click per document", async () => {
      const session = await openBrowserOnly(layout);
      for (const name of FRAME_NAMES) {
        await frameFor(session, name).locator("button").click();
      }
      for (const name of FRAME_NAMES) {
        const state = await readState(session, name);
        expect(state.clicks, name).toHaveLength(1);
        expect(state.clicks[0]?.trusted, name).toBe(true);
        expect(state.misses, name).toEqual([]);
      }
    });

    it("runs the child and nested frames as separate out-of-process targets", async () => {
      const session = await openBrowserOnly(layout);
      const browser = session.page.context().browser();
      if (browser === null) throw new Error("The session page has no browser");
      const cdp = await browser.newBrowserCDPSession();
      const { targetInfos } = (await cdp.send("Target.getTargets")) as {
        targetInfos: Array<{ type: string; url: string }>;
      };
      await cdp.detach();
      const iframeTargets = targetInfos
        .filter((target) => target.type === "iframe")
        .map((target) => new URL(target.url).pathname)
        .toSorted();
      expect(iframeTargets).toEqual(["/child", "/nested"]);
    });
  },
);

describe("production StagehandSession (attached before navigation), nested on a third site", () => {
  const testCase = { attach: "early", layout: "third-site" } as const;

  it("page.snapshot() lists the button of every frame by default", async () => {
    const opened = await openFixture(testCase);
    expectSnapshotOfAllFrames(await snapshotWithAllFrames(opened, READINESS_DEADLINE_MS));
  });

  it.each(FRAME_NAMES)(
    "a snapshot XPath and page.deepLocator click the %s button",
    async (target) => {
      const opened = await openFixture(testCase);
      const snapshot = await snapshotWithAllFrames(opened, READINESS_DEADLINE_MS);
      await expectDeepLocatorClick(opened, snapshot, target);
    },
  );

  it("the buyer created after the page load reuses the same instance, which still sees every frame", async () => {
    const opened = await openFixture(testCase);
    const { prepared } = opened;
    if (prepared === undefined) throw new Error("The early path has no prepared session");
    await snapshotWithAllFrames(opened, READINESS_DEADLINE_MS);

    const buyer = await createStagehandBuyer({
      session: prepared,
      onEvidence: () => {},
      model: {
        modelName: "anthropic/claude-haiku-5-5",
        apiKey: "sk-dummy-unused-000000",
        baseURL: `${model.origin}/v1`,
      },
    });

    expect(prepared.observer.context.pages()).toEqual([opened.page]);
    // Already converged above, so this is a single snapshot through the same instance.
    expectSnapshotOfAllFrames(await opened.page.snapshot());
    await buyer.close();
    // The buyer detached the shared instance; the browser stays open.
    expect(await opened.session.page.evaluate(() => 1 + 1)).toBe(2);
  });
});

describe("known Stagehand 3.7.3 gaps (expected failures)", () => {
  // Gap 1, reproduced with a raw attach after the page loaded.
  const late = { attach: "late-raw", layout: "third-site" } as const;

  it.fails("SDK GAP 1: a late attach never lists the existing cross-site frames", async () => {
    await expectKnownGap(async () => {
      const opened = await openFixture(late);
      const gap = await expectFramesNotListed(opened, READINESS_DEADLINE_MS, ["child", "nested"]);
      throw new KnownGapError(gap.message);
    });
  });

  it.fails.each(["child", "nested"] as const)(
    "SDK GAP 1: a late attach cannot click the %s button",
    async (target) => {
      await expectKnownGap(async () => {
        const opened = await openFixture(late);
        await expectFramesNotListed(opened, GAP_CLICK_READINESS_MS, ["child", "nested"]);
        await expectFrameUnreachable(opened, target);
      });
    },
  );

  // Gap 2, with the production early attach.
  const aba = { attach: "early", layout: "top-site" } as const;

  it.fails("SDK GAP 2: an A-B-A nested frame is never listed, even with the early attach", async () => {
    await expectKnownGap(async () => {
      const opened = await openFixture(aba);
      const gap = await expectFramesNotListed(opened, READINESS_DEADLINE_MS, ["nested"]);
      throw new KnownGapError(gap.message);
    });
  });

  it.fails("SDK GAP 2: an A-B-A nested button cannot be clicked, even with the early attach", async () => {
    await expectKnownGap(async () => {
      const opened = await openFixture(aba);
      await expectFramesNotListed(opened, GAP_CLICK_READINESS_MS, ["nested"]);
      await expectFrameUnreachable(opened, "nested");
    });
  });
});

/** Thrown only when a known SDK gap shows exactly the expected symptom. */
class KnownGapError extends Error {}

/**
 * Runs a gap reproduction inside `it.fails`. Only a `KnownGapError` is rethrown, so only the
 * exact expected symptom counts as the known failure. Any other outcome (a setup error, a
 * different missing set, or the gap closing) returns normally, which makes `it.fails` red.
 */
async function expectKnownGap(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (error instanceof KnownGapError) throw error;
    process.stderr.write(`Unexpected outcome in a known SDK gap test: ${String(error)}\n`);
    return;
  }
  process.stderr.write("A known SDK gap did not reproduce. Review it after an SDK change.\n");
}

/**
 * Polls with the given deadline and requires exactly `expected` buttons to stay missing.
 * Returns that gap, so the caller decides whether it is the final symptom (snapshot tests)
 * or a precondition (click tests). Any other outcome throws a plain error.
 */
async function expectFramesNotListed(
  opened: Opened,
  deadlineMs: number,
  expected: readonly FrameName[],
): Promise<FramesNotListedError> {
  const error = await snapshotWithAllFrames(opened, deadlineMs).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  if (!(error instanceof FramesNotListedError)) {
    throw new Error(`Expected missing frames ${expected.join(", ")}, got: ${String(error)}`);
  }
  if (error.missing.join(",") !== expected.join(",")) {
    throw new Error(
      `Expected missing frames ${expected.join(", ")}, got ${error.missing.join(", ")}`,
    );
  }
  return error;
}

/**
 * The dispatch layer for a frame the snapshot does not list: `deepLocator` with the
 * fixture's own deep XPath must fail to enter the frame, and no click may land.
 */
async function expectFrameUnreachable(opened: Opened, target: Exclude<FrameName, "main">) {
  const xpath = {
    child: "/html/body/iframe[1]/html/body/button[1]",
    nested: "/html/body/iframe[1]/html/body/iframe[1]/html/body/button[1]",
  }[target];
  const error = await opened.page
    .deepLocator(`xpath=${xpath}`)
    .click()
    .then(
      () => undefined,
      (caught: unknown) => caught,
    );
  const clicks = (await readState(opened.session, target)).clicks.length;
  if (
    clicks === 0 &&
    error instanceof Error &&
    /Unable to obtain a content frame/.test(error.message)
  ) {
    throw new KnownGapError(error.message);
  }
  throw new Error(
    `Expected an unreachable ${target} frame, got clicks=${clicks}, error=${String(error)}`,
  );
}

type Case = { attach: Attach; layout: Layout };

/** Every fixture button that `page.snapshot()` does not list yet. */
function missingFrames(tree: string): FrameName[] {
  return FRAME_NAMES.filter((name) => findElementId(tree, FRAMES[name].label) === undefined);
}

class FramesNotListedError extends Error {
  readonly missing: FrameName[];
  constructor(missing: FrameName[], waitedMs: number, polls: number, tree: string) {
    super(
      `Stagehand did not list ${missing.join(", ")} within ${waitedMs} ms (${polls} snapshots). Last snapshot:\n${tree}`,
    );
    this.missing = missing;
  }
}

/**
 * Polls `page.snapshot()` until it lists every fixture button, up to `deadlineMs`. This is
 * the observable readiness of Stagehand's frame graph; Playwright's frame events can come
 * first. At the deadline, the last snapshot is kept once as a debug artifact and the
 * function throws `FramesNotListedError`.
 */
async function snapshotWithAllFrames(opened: Opened, deadlineMs: number): Promise<Snapshot> {
  const started = Date.now();
  let polls = 0;
  for (;;) {
    const snapshot = await opened.page.snapshot();
    polls += 1;
    const missing = missingFrames(snapshot.formattedTree);
    if (missing.length === 0) return snapshot;
    const waitedMs = Date.now() - started;
    if (waitedMs >= deadlineMs) {
      const error = new FramesNotListedError(missing, waitedMs, polls, snapshot.formattedTree);
      await writeDebugArtifacts(opened.session, "readiness", snapshot.formattedTree);
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, READINESS_POLL_GAP_MS));
  }
}

function expectSnapshotOfAllFrames(snapshot: Snapshot): void {
  const { formattedTree: tree, xpathMap } = snapshot;
  const ids = FRAME_NAMES.map((name) => elementId(tree, FRAMES[name].label));
  // Exactly one button per label, and one frame ordinal per document.
  for (const name of FRAME_NAMES) {
    expect(countLabel(tree, FRAMES[name].label), name).toBe(1);
  }
  expect(new Set(ids.map((id) => id.split("-")[0])).size).toBe(3);
  // The main, child, and nested XPaths cross zero, one, and two iframe steps.
  expect(ids.map((id) => iframeSteps(xpathMap[id] ?? ""))).toEqual([0, 1, 2]);
}

/** Stagehand's act path after element selection: snapshot ID → deep XPath → deepLocator click. */
async function expectDeepLocatorClick(
  opened: Opened,
  snapshot: Snapshot,
  target: FrameName,
): Promise<void> {
  const { session, page } = opened;
  await withDebugArtifacts(session, `click-${target}`, snapshot.formattedTree, async () => {
    const xpath = snapshot.xpathMap[elementId(snapshot.formattedTree, FRAMES[target].label)];
    if (xpath === undefined) throw new Error(`No XPath for the ${target} button`);
    // The selector form that Stagehand's act handler builds from an element ID.
    await page.deepLocator(`xpath=${xpath}`).click();

    await waitFor(async () => (await readState(session, target)).clicks.length > 0, 10_000);
    await waitFor(async () => (await readState(session, "main")).messages.length > 0, 5_000);
    for (const name of FRAME_NAMES) {
      const state = await readState(session, name);
      expect(state.misses, `${name} misses`).toEqual([]);
      expect(state.clicks, `${name} clicks`).toHaveLength(name === target ? 1 : 0);
    }
    const { clicks } = await readState(session, target);
    expect(clicks[0]?.trusted).toBe(true);
    expect((await readState(session, "main")).messages).toEqual([{ frame: target, clicks: 1 }]);
  });
}

async function newBrowser(layout: Layout): Promise<{ session: BrowserSession; url: string }> {
  const url = `http://127.0.0.1:${fixture.port}/?nested=${layout}`;
  const session = await createBrowserSession({
    baseUrl: url,
    artifactDirectory: workDir,
    onEvidence: () => {},
  });
  cleanup.push(async () => session.close());
  return { session, url };
}

/** Loads the fixture, waits for every frame, and scrolls the main page and the child frame. */
async function loadFixture(session: BrowserSession, url: string): Promise<void> {
  await session.page.goto(url);
  await waitFor(async () => frameIfReady(session, "nested") !== undefined, 15_000);
  for (const name of FRAME_NAMES) {
    await frameFor(session, name).waitForFunction(() => document.readyState === "complete");
  }
  await session.page.evaluate(() => window.scrollTo(0, 450));
  await frameFor(session, "child").evaluate(() => window.scrollTo(0, 160));
}

async function openBrowserOnly(layout: Layout): Promise<BrowserSession> {
  const { session, url } = await newBrowser(layout);
  await loadFixture(session, url);
  return session;
}

async function openFixture({ attach, layout }: Case): Promise<Opened> {
  const { session, url } = await newBrowser(layout);
  if (attach === "early") {
    // Production order: prepare on the blank browser, then the first navigation.
    const prepared = await prepareStagehandSession(session);
    cleanup.push(async () => prepared.close());
    await loadFixture(session, url);
    const page = onlyPage(prepared.observer);
    expect(page.url()).toBe(url);
    return { session, page, prepared };
  }
  await loadFixture(session, url);
  return { session, page: await attachRawStagehand(session) };
}

/** A raw Stagehand attach after the page loaded. Used only to reproduce SDK gap 1. */
async function attachRawStagehand(session: BrowserSession): Promise<StagehandPage> {
  const { Stagehand } = await import("@browserbasehq/stagehand");
  const stagehand = new Stagehand({
    env: "LOCAL",
    localBrowserLaunchOptions: { cdpUrl: session.cdpUrl },
    experimental: true,
    disableAPI: true,
    verbose: 0,
    disablePino: true,
    logger: () => undefined,
  });
  cleanup.push(async () => stagehand.close());
  await stagehand.init();
  return onlyPage(stagehand);
}

/** The session's only tab: no second browser or page. */
function onlyPage(stagehand: Stagehand): StagehandPage {
  const pages = stagehand.context.pages();
  expect(pages).toHaveLength(1);
  const page = pages[0];
  if (page === undefined) throw new Error("Stagehand found no page");
  return page;
}

function frameIfReady(session: BrowserSession, name: FrameName): Frame | undefined {
  return session.page.frames().find((frame) => {
    try {
      return new URL(frame.url()).pathname === FRAMES[name].path;
    } catch {
      return false;
    }
  });
}

function frameFor(session: BrowserSession, name: FrameName): Frame {
  const frame = frameIfReady(session, name);
  if (frame === undefined) throw new Error(`The ${name} frame is not loaded`);
  return frame;
}

/** Observation only: reads what the fixture recorded in one document. */
async function readState(session: BrowserSession, name: FrameName): Promise<FixtureState> {
  return frameFor(session, name).evaluate(() => {
    const state = (globalThis as unknown as { __fixture?: FixtureState }).__fixture;
    return state ?? { clicks: [], misses: [], messages: [] };
  });
}

function labelPattern(label: string, flags: string): RegExp {
  return new RegExp(`\\[(\\d+-\\d+)\\] button: ${label}$`, flags);
}

function findElementId(tree: string, label: string): string | undefined {
  return labelPattern(label, "m").exec(tree)?.[1];
}

function countLabel(tree: string, label: string): number {
  return [...tree.matchAll(labelPattern(label, "gm"))].length;
}

function elementId(tree: string, label: string): string {
  const id = findElementId(tree, label);
  if (id === undefined) throw new Error(`The snapshot has no button "${label}":\n${tree}`);
  return id;
}

function iframeSteps(xpath: string): number {
  return xpath.split("/").filter((step) => /^iframe(\[\d+\])?$/.test(step)).length;
}

/**
 * Keeps the snapshot tree, a screenshot, and each frame's click state in
 * `AGENTIC_E2E_FRAMES_DEBUG_DIR` when that variable is set. Nothing is written otherwise.
 * Returns the directory, if any.
 */
async function writeDebugArtifacts(
  session: BrowserSession,
  label: string,
  tree: string,
): Promise<string | undefined> {
  const root = process.env.AGENTIC_E2E_FRAMES_DEBUG_DIR;
  if (root === undefined || root === "") return undefined;
  const directory = await mkdtemp(join(root, `frames-${label}-`));
  await writeFile(join(directory, "snapshot.txt"), tree);
  await session.page.screenshot({ path: join(directory, "page.png") }).catch(() => undefined);
  const states = await Promise.all(
    FRAME_NAMES.map(async (name) => [name, await readState(session, name)] as const),
  );
  await writeFile(
    join(directory, "state.json"),
    JSON.stringify(Object.fromEntries(states), null, 2),
  );
  return directory;
}

/** On failure of `run`, writes the debug artifacts once and adds their location to the error. */
async function withDebugArtifacts(
  session: BrowserSession,
  label: string,
  tree: string,
  run: () => Promise<void>,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    const directory = await writeDebugArtifacts(session, label, tree);
    if (directory === undefined) throw error;
    throw new Error(`${String(error)}\nDebug artifacts: ${directory}`, { cause: error });
  }
}

async function waitFor(predicate: () => Promise<boolean> | boolean, timeout: number) {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function fixtureRoutes(request: IncomingMessage, response: ServerResponse) {
  const { pathname, searchParams } = new URL(request.url ?? "/", "http://fixture");
  const port = fixture.port;
  const layout = LAYOUTS.find((value) => value === searchParams.get("nested")) ?? "third-site";
  const pages: Record<string, string> = {
    "/": fixtureDocument(
      "main",
      "body{margin:0;height:3000px} #target{position:absolute;left:420px;top:700px}" +
        " iframe{position:absolute;left:260px;top:1300px;width:520px;height:320px;border:2px solid #333}",
      `<iframe title="Child frame" src="http://localhost:${port}/child?nested=${layout}"></iframe>`,
    ),
    "/child": fixtureDocument(
      "child",
      "body{margin:0;height:1500px} #target{position:absolute;left:180px;top:520px}" +
        " iframe{position:absolute;left:60px;top:800px;width:380px;height:240px;border:2px solid #666}",
      `<iframe title="Nested frame" src="http://${NESTED_HOST[layout]}:${port}/nested"></iframe>`,
    ),
    "/nested": fixtureDocument(
      "nested",
      "body{margin:0;height:900px} #target{position:absolute;left:140px;top:420px}",
      "",
    ),
  };
  const html = pages[pathname];
  if (html === undefined) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": "text/html" }).end(html);
}

function fixtureDocument(name: FrameName, css: string, extra: string): string {
  return `<!doctype html><title>${name}</title><style>${css}</style>
<button id="target" type="button">${FRAMES[name].label}</button>${extra}
<script>
  const state = { clicks: [], misses: [], messages: [] };
  window.__fixture = state;
  const button = document.getElementById("target");
  button.addEventListener("click", (event) => {
    state.clicks.push({ trusted: event.isTrusted, x: event.clientX, y: event.clientY });
    window.top.postMessage({ frame: ${JSON.stringify(name)}, clicks: state.clicks.length }, "*");
  });
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : document.documentElement;
    if (target !== button) {
      state.misses.push({ tag: target.tagName, id: target.id, x: event.clientX, y: event.clientY });
    }
  }, true);
  window.addEventListener("message", (event) => {
    if (event.data && typeof event.data.frame === "string") state.messages.push(event.data);
  });
</script>`;
}

/** `::` accepts IPv4 (127.0.0.1, localhost) and IPv6 ([::1]) loopback connections. */
async function listen(server: Server, host = "127.0.0.1"): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, host, resolve));
  return (server.address() as AddressInfo).port;
}
