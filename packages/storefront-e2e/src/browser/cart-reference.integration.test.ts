import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, it, vi } from "vitest";

import { readCartReference } from "./cart-reference.ts";
import { createBrowserSession, type BrowserSession } from "./session.ts";

// A real headless browser against local pages with stand-ins for the Shopify Standard Action
// `getCart(payload?, options?)`, with the documented two-argument signature: `options.signal`
// is the second argument. Each stand-in records its calls and arguments, and whether its
// signal aborted; no page requests a cart from any server.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const CART_ID = "gid://shopify/Cart/fixtureActionTok?key=fixtureActionKey";
const action = (body: string) => `<script>
  window.calls = [];
  window.Shopify = { actions: { getCart: async (payload, options) => {
    const signal = options?.signal;
    window.calls.push({ payload: payload === undefined ? "undefined" : typeof payload, signal: signal instanceof AbortSignal });
    signal?.addEventListener("abort", () => { window.signalAborted = true; });
    ${body}
  } } };
</script><p>Store</p>`;
const PAGES: Record<string, string> = {
  // The summary quantity is not used: only `cart.id` is read.
  "/cart": action(`return { cart: { id: ${JSON.stringify(CART_ID)}, totalQuantity: 99 } };`),
  "/empty": action("return { cart: null };"),
  "/none": "<p>No Standard Actions</p>",
  "/throws": action(`throw new Error("leaked ${CART_ID}");`),
  "/malformed": action("return { cart: { id: 5 } };"),
  "/no-cart-key": action("return {};"),
  "/hangs": action("return new Promise(() => {});"),
};

let server: Server;
let origin: string;
let workDir: string;
let session: BrowserSession;
const requests: string[] = [];

beforeAll(async () => {
  server = createServer((request, response) => {
    // The browser's own favicon request is not page traffic.
    if (request.url !== "/favicon.ico") requests.push(request.url ?? "/");
    const html = PAGES[new URL(request.url ?? "/", "http://fixture").pathname];
    if (html === undefined) return void response.writeHead(404).end();
    response.writeHead(200, { "content-type": "text/html" }).end(`<!doctype html>${html}`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  workDir = await mkdtemp(join(tmpdir(), "storefront-e2e-cart-reference-"));
  session = await createBrowserSession({
    baseUrl: `${origin}/cart`,
    artifactDirectory: workDir,
    onEvidence: () => {},
  });
});

afterAll(async () => {
  await session.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(workDir, { recursive: true, force: true });
});

async function open(path: string) {
  await session.page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
  requests.length = 0;
}

type Call = { payload: string; signal: boolean };

async function calls(): Promise<Call[]> {
  return session.page.evaluate(() => (window as unknown as { calls?: Call[] }).calls ?? []);
}

async function signalAborted(): Promise<boolean> {
  return session.page.evaluate(
    () => (window as unknown as { signalAborted?: boolean }).signalAborted === true,
  );
}

const signal = () => new AbortController().signal;

describe("readCartReference", () => {
  it("returns the cart ID that getCart reports, without navigation, requests, or cookies", async () => {
    await open("/cart");
    const url = session.page.url();
    const cookies = await session.page.context().cookies();

    const reference = await readCartReference(session.page, signal());

    assert.deepEqual(reference, { status: "available", cartId: CART_ID });
    // One call: no payload, so no cart is selected, and the abort signal in `options`.
    assert.deepEqual(await calls(), [{ payload: "undefined", signal: true }]);
    assert.equal(session.page.url(), url);
    assert.deepEqual(requests, []);
    assert.deepEqual(await session.page.context().cookies(), cookies);
  });

  it("returns empty for { cart: null }, and unavailable at once without the action", async () => {
    await open("/empty");
    assert.deepEqual(await readCartReference(session.page, signal()), { status: "empty" });

    await open("/none");
    const started = Date.now();
    assert.deepEqual(await readCartReference(session.page, signal()), { status: "unavailable" });
    assert.ok(Date.now() - started < 1_000);
  });

  it.each([
    ["/throws", "The page cart action failed."],
    ["/malformed", "The page cart action returned an unknown shape."],
    ["/no-cart-key", "The page cart action returned an unknown shape."],
  ])("rejects %s with a fixed message", async (path, message) => {
    await open(path);
    await assert.rejects(readCartReference(session.page, signal()), (error: Error) => {
      assert.equal(error.message, message);
      assert.equal(error.message.includes("fixtureAction"), false);
      return true;
    });
  });

  it("rejects a hanging action at its deadline, and promptly on abort", async () => {
    await open("/hangs");
    await assert.rejects(
      readCartReference(session.page, signal(), 300),
      /did not settle within 300 ms/,
    );
    // The action's own `options.signal` was aborted at the deadline.
    assert.equal(await signalAborted(), true);

    const controller = new AbortController();
    const reason = new Error("stop");
    const started = Date.now();
    const pending = readCartReference(session.page, controller.signal, 10_000);
    setTimeout(() => controller.abort(reason), 100);
    await assert.rejects(pending, (error) => error === reason);
    assert.ok(Date.now() - started < 1_000);
  });
});
