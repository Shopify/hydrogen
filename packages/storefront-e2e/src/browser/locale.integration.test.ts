import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { EvidenceRecord } from "../evidence.ts";
import { LocaleUnavailableError } from "../storefront-locale-error.ts";
import { readStorefrontLocale, STOREFRONT_LOCALE_KIND } from "./locale.ts";
import { createBrowserSession, type BrowserSession } from "./session.ts";

// Real headless Chromium against local HTTP fixtures. No model calls.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const shopify = (globals: Record<string, string>) =>
  `<script>window.Shopify = ${JSON.stringify(globals)};</script>`;

const PAGES: Record<string, string> = {
  "/us": `<title>US</title>${shopify({ country: "US", locale: "en" })}<p>US</p>`,
  "/ca-fr": `${shopify({ country: "CA", locale: "fr" })}<p>CA</p>`,
  "/language-fallback": shopify({ country: "ca", language: "pt-BR" }),
  // Hydrogen-style bootstrap: the globals appear after the document loads.
  "/late": `<p>Late</p><script>setTimeout(() => {
    window.Shopify = window.Shopify || {};
    Object.assign(window.Shopify, { country: "US", locale: "en" });
  }, 700);</script>`,
  "/none": "<p>No Shopify globals</p>",
  // Shopify is set (for example by other scripts), but with no country or locale.
  "/empty-shopify": `<script>window.Shopify = { routes: { root: "/" } };</script><p>No locale</p>`,
  "/partial-country": `${shopify({ country: "CA" })}<p>Country only</p>`,
  "/partial-language": `${shopify({ locale: "fr" })}<p>Locale only</p>`,
  "/wrong-type": `<script>window.Shopify = { country: 5, locale: "en" };</script>`,
  "/throwing": `<script>window.Shopify = {}; Object.defineProperty(window.Shopify, "country", { get() { throw new Error("no"); } });</script>`,
  "/invalid": shopify({ country: "USA", locale: "english" }),
  "/with-frame": `${shopify({ country: "US", locale: "en" })}<iframe src="/ca-fr"></iframe>`,
};
const CHECKOUT_PATH = "/cart/c/c1-localefixture?key=fixturekey";

let server: Server;
let origin: string;
let workDir: string;
const sessions: BrowserSession[] = [];

beforeAll(async () => {
  server = createServer((request, response) => {
    const page = PAGES[new URL(request.url ?? "/", origin).pathname];
    if (page === undefined) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": "text/html" }).end(`<!doctype html>${page}`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  workDir = await mkdtemp(join(tmpdir(), "storefront-e2e-locale-test-"));
});

afterEach(async () => {
  await Promise.allSettled(sessions.map(async (session) => session.close()));
  sessions.length = 0;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(workDir, { recursive: true, force: true });
});

describe("readStorefrontLocale", () => {
  it("reads the storefront country and language, not the browser language", async () => {
    const { session } = await startSession();
    await session.page.goto(`${origin}/us`);

    await expect(readStorefrontLocale(session)).resolves.toEqual({ country: "US", language: "EN" });

    await session.page.goto(`${origin}/language-fallback`);
    await expect(readStorefrontLocale(session)).resolves.toEqual({
      country: "CA",
      language: "PT_BR",
    });
  });

  it("waits for globals that the storefront sets after load", async () => {
    const { session } = await startSession();
    await session.page.goto(`${origin}/late`);

    await expect(readStorefrontLocale(session)).resolves.toEqual({ country: "US", language: "EN" });
  });

  it("rejects a page without Shopify globals within the time limit", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${origin}/none`);

    const started = Date.now();
    await expect(readStorefrontLocale(session)).rejects.toThrow(
      "Storefront locale is not readable",
    );
    expect(Date.now() - started).toBeLessThan(7_000);
    expect(kinds(evidence)).toEqual([]);
  });

  it("reports a readable page with no locale at all as unavailable, not as a mismatch", async () => {
    const { session } = await startSession();
    for (const path of ["/none", "/empty-shopify"]) {
      await session.page.goto(`${origin}${path}`);
      await expect(readStorefrontLocale(session), path).rejects.toBeInstanceOf(
        LocaleUnavailableError,
      );
    }
  });

  it("never reports a partial, wrongly typed, or unreadable value as unavailable", async () => {
    const { session } = await startSession();
    const cases: Array<[string, RegExp]> = [
      ["/partial-country", /country "CA" and locale \(missing\)/],
      ["/partial-language", /country \(missing\) and locale "fr"/],
      ["/wrong-type", /country \(unreadable\) and locale "en"/],
      ["/throwing", /the page did not answer, closed, or failed to evaluate/],
    ];
    for (const [path, message] of cases) {
      await session.page.goto(`${origin}${path}`);
      const error = await readStorefrontLocale(session).catch((caught: unknown) => caught);
      expect(error, path).toBeInstanceOf(Error);
      expect(error, path).not.toBeInstanceOf(LocaleUnavailableError);
      expect((error as Error).message, path).toMatch(message);
    }
    await session.page.close();
    const closed = await readStorefrontLocale(session).catch((caught: unknown) => caught);
    expect(closed).not.toBeInstanceOf(LocaleUnavailableError);
  });

  it("rejects invalid values without guessing", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${origin}/invalid`);

    await expect(readStorefrontLocale(session)).rejects.toThrow(
      'Storefront locale is not valid: window.Shopify.country "USA" and locale "english"',
    );
    expect(kinds(evidence)).toEqual([]);
  });
});

describe("storefront locale observer", () => {
  it("records the initial locale and later changes of the main page only", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${origin}/us?token=secret#top`);
    await waitFor(() => kinds(evidence).length === 1);

    // A client-side country switch, as a storefront does after a localization change.
    await session.page.evaluate(() => {
      Object.assign(window as unknown as { Shopify: object }, {
        Shopify: { country: "CA", locale: "fr" },
      });
    });
    await waitFor(() => kinds(evidence).length === 2);

    expect(kinds(evidence)).toEqual([
      {
        kind: STOREFRONT_LOCALE_KIND,
        timestamp: expect.any(Number),
        data: { country: "US", language: "EN", url: `${origin}/us` },
      },
      {
        kind: STOREFRONT_LOCALE_KIND,
        timestamp: expect.any(Number),
        data: { country: "CA", language: "FR", url: `${origin}/us` },
      },
    ]);
    expect(JSON.stringify(evidence)).not.toContain("secret");
  });

  it("does not record a change for documents without globals or the same locale", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${origin}/us`);
    await waitFor(() => kinds(evidence).length === 1);

    await session.page.goto(`${origin}/none`);
    await session.page.goto(`${origin}/late`);
    await expect(readStorefrontLocale(session)).resolves.toEqual({ country: "US", language: "EN" });
    await session.page.goto(`${origin}/ca-fr`);
    await waitFor(() => kinds(evidence).length === 2);
    await delay(600);

    expect(kinds(evidence).map((record) => record.data)).toEqual([
      { country: "US", language: "EN", url: `${origin}/us` },
      { country: "CA", language: "FR", url: `${origin}/ca-fr` },
    ]);
  });

  it("ignores frames and popups with another locale", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${origin}/with-frame`);
    await session.page.frameLocator("iframe").locator("p").waitFor();

    const popup = session.page.context().waitForEvent("page");
    await session.page.evaluate(() => void window.open("/ca-fr", "_blank"));
    const opened = await popup;
    await opened.waitForLoadState("load");
    expect(await opened.evaluate(() => (window as { Shopify?: unknown }).Shopify)).toEqual({
      country: "CA",
      locale: "fr",
    });
    await delay(600);

    await expect(readStorefrontLocale(session)).resolves.toEqual({ country: "US", language: "EN" });
    expect(kinds(evidence).map((record) => record.data)).toEqual([
      { country: "US", language: "EN", url: `${origin}/with-frame` },
    ]);
  });

  it("keeps the last locale and reports nothing after a blocked checkout", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${origin}/us`);
    await waitFor(() => kinds(evidence).length === 1);

    await session.page.goto(`${origin}${CHECKOUT_PATH}`).catch(() => undefined);

    await expect(readStorefrontLocale(session)).rejects.toThrow(
      "Storefront locale is not readable",
    );
    expect(kinds(evidence).map((record) => record.data)).toEqual([
      { country: "US", language: "EN", url: `${origin}/us` },
    ]);
  });

  it("does not change the Shopify globals", async () => {
    const { session, evidence } = await startSession();
    await session.page.goto(`${origin}/us`);
    await waitFor(() => kinds(evidence).length === 1);

    const globals = await session.page.evaluate(() => {
      const value = (window as { Shopify?: object }).Shopify;
      return value === undefined ? [] : Object.getOwnPropertyNames(value);
    });
    expect(globals).toEqual(["country", "locale"]);
  });
});

async function startSession() {
  const evidence: EvidenceRecord[] = [];
  const session = await createBrowserSession({
    baseUrl: origin,
    artifactDirectory: workDir,
    onEvidence: (record) => void evidence.push(record),
  });
  sessions.push(session);
  return { session, evidence };
}

function kinds(evidence: EvidenceRecord[]) {
  return evidence.filter((record) => record.kind === STOREFRONT_LOCALE_KIND);
}

async function waitFor(predicate: () => boolean | Promise<boolean>, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for condition");
    await delay(25);
  }
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
