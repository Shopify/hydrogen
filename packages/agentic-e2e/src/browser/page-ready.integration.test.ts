import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prepareStagehandSession, type StagehandSession } from "../agent/stagehand-session.ts";
import { waitForPageReady, type PageReadyOptions } from "./page-ready.ts";
import { createBrowserSession, type BrowserSession } from "./session.ts";

// A real headless browser against local generic pages. Each page sets
// `window.revealed = true` when its own script makes the body observable.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const REVEAL = (change: string) =>
  `<script>setTimeout(() => { ${change}; window.revealed = true; }, 300);</script>`;
const PAGES: Record<string, string> = {
  "/visible": "<body><p>Ready</p></body>",
  "/display": `<body style="display:none"><p>Late</p>${REVEAL("document.body.style.display = ''")}</body>`,
  "/opacity": `<body style="opacity:0"><p>Late</p>${REVEAL("document.body.style.opacity = '1'")}</body>`,
  "/visibility": `<body style="visibility:hidden"><p>Late</p>${REVEAL("document.body.style.visibility = 'visible'")}</body>`,
  // The script sits in <head>, so the body starts with no child elements.
  "/empty": `<head>${REVEAL("document.body.append(document.createElement('p'))")}</head><body></body>`,
  "/hidden": `<body style="display:none"><p>Never</p></body>`,
  // The body is visible as soon as it is parsed, but DOMContentLoaded waits for the
  // deferred script, which the server holds until the test releases it.
  "/deferred": `<head><script defer src="/held.js"></script></head><body><p>Visible early</p></body>`,
  "/replace": `<body style="display:none"><p>Leaving</p><script>setTimeout(() => location.replace('/deferred'), 100)</script></body>`,
};
const HELD_SCRIPT = "window.deferredRan = true;";
/** Releases the response for `/held.js` that the server is holding, if any. */
let releaseHeldScript: (() => void) | undefined;
let heldScriptRequested = false;

let server: Server;
let origin: string;
let workDir: string;
let session: BrowserSession;
let prepared: StagehandSession;

beforeAll(async () => {
  server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://fixture").pathname;
    if (path === "/held.js") {
      heldScriptRequested = true;
      releaseHeldScript = () => {
        releaseHeldScript = undefined;
        response.writeHead(200, { "content-type": "text/javascript" }).end(HELD_SCRIPT);
      };
      return;
    }
    const html = PAGES[path];
    if (html === undefined) return void response.writeHead(404).end();
    response.writeHead(200, { "content-type": "text/html" }).end(`<!doctype html>${html}`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-page-ready-"));
  session = await createBrowserSession({
    baseUrl: `${origin}/visible`,
    artifactDirectory: workDir,
    onEvidence: () => {},
  });
  prepared = await prepareStagehandSession(session);
});

afterAll(async () => {
  releaseHeldScript?.();
  await prepared.detach();
  await session.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(workDir, { recursive: true, force: true });
});

async function revealed(): Promise<boolean> {
  return session.page.evaluate(
    () => (window as unknown as { revealed?: boolean }).revealed === true,
  );
}

describe.each(["Playwright", "Stagehand"])("%s page readiness", (client) => {
  const waitForReady = async (options?: PageReadyOptions) =>
    client === "Playwright"
      ? waitForPageReady(session.page, options)
      : waitForPageReady(prepared.observer.context.awaitActivePage(), options);
  it("resolves at once for a visible page", async () => {
    await session.page.goto(`${origin}/visible`);
    const started = Date.now();

    await waitForReady({ timeoutMs: 5_000 });

    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it.each(["/display", "/opacity", "/visibility", "/empty"])(
    "waits until the page script makes the %s body observable",
    async (path) => {
      await session.page.goto(`${origin}${path}`);
      expect(await revealed()).toBe(false);

      await waitForReady({ timeoutMs: 5_000 });

      expect(await revealed()).toBe(true);
    },
  );

  it("waits for DOMContentLoaded even when the body is already visible", async () => {
    heldScriptRequested = false;
    try {
      await session.page.goto(`${origin}/deferred`, { waitUntil: "commit" });
      let resolved = false;
      const pending = waitForReady({ timeoutMs: 10_000 }).then(() => {
        resolved = true;
      });
      // The body is parsed and visible, the deferred script is requested and held,
      // so DOMContentLoaded has not fired yet.
      await session.page.waitForFunction(
        () => document.readyState === "interactive" && document.body.childElementCount > 0,
      );
      expect(heldScriptRequested).toBe(true);
      // Two rendered frames give any visible-body check time to settle.
      await session.page.evaluate(
        async () =>
          new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      expect(resolved).toBe(false);

      releaseHeldScript?.();
      await pending;

      expect(
        await session.page.evaluate(
          () => (window as unknown as { deferredRan?: boolean }).deferredRan === true,
        ),
      ).toBe(true);
    } finally {
      releaseHeldScript?.();
    }
  });

  it("rejects at the deadline with a message that holds no page content or URL", async () => {
    await session.page.goto(`${origin}/hidden`);

    const error = await waitForReady({ timeoutMs: 300 }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Page did not become observable within 300 ms.");
    expect((error as Error).cause).toBeUndefined();
  });

  it("keeps waiting through navigation that replaces the evaluation context", async () => {
    heldScriptRequested = false;
    try {
      await session.page.goto(`${origin}/replace`);
      let resolved = false;
      const pending = waitForReady({ timeoutMs: 10_000 }).then(() => {
        resolved = true;
      });
      await session.page.waitForURL(`${origin}/deferred`, { waitUntil: "commit" });
      await session.page.waitForFunction(
        () => document.readyState === "interactive" && document.body.childElementCount > 0,
      );
      expect(heldScriptRequested).toBe(true);
      expect(resolved).toBe(false);

      releaseHeldScript?.();
      await pending;

      expect(
        await session.page.evaluate(
          () => (window as unknown as { deferredRan?: boolean }).deferredRan === true,
        ),
      ).toBe(true);
    } finally {
      releaseHeldScript?.();
    }
  });

  it("rejects promptly when aborted during the wait, and at once when already aborted", async () => {
    await session.page.goto(`${origin}/hidden`);
    const controller = new AbortController();
    const reason = new Error("stop");
    const started = Date.now();

    const pending = waitForReady({
      signal: controller.signal,
      timeoutMs: 10_000,
    });
    setTimeout(() => controller.abort(reason), 100);

    await expect(pending).rejects.toBe(reason);
    expect(Date.now() - started).toBeLessThan(1_000);
    await expect(waitForReady({ signal: controller.signal })).rejects.toBe(reason);
  });
});
