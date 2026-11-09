import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, it, vi } from "vitest";

import { CartReadError } from "./cart-error.ts";
import { readCart } from "./cart.ts";
import { createBrowserSession, type BrowserSession } from "./session.ts";

// A real headless browser against a local storefront fixture. The page adds to the cart with a
// UI button; the server keeps the cart behind an HttpOnly session cookie that it sets itself.
// The reader knows no cookie name and no cart ID. No model, store, or external request.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

const SECRET_TOKEN = "fixtureSecretCartTok42";
const carts = new Map<string, number>();
/** Paths of every cart JSON request, and the cookie header names it carried. */
const cartRequests: Array<{ path: string; cookie: boolean }> = [];
let cartHandler: Handler | undefined;
let otherHits = 0;

let server: Server;
let other: Server;
let origin: string;
let otherOrigin: string;
let workDir: string;
const sessions: BrowserSession[] = [];

function sessionId(request: IncomingMessage): string | undefined {
  return /(?:^|;\s*)fixture_sid=([^;]+)/.exec(request.headers.cookie ?? "")?.[1];
}

/** The fixture's own cart JSON, with fields that must never leave the page. */
const defaultCart: Handler = (request, response) => {
  const quantity = carts.get(sessionId(request) ?? "") ?? 0;
  json(response, {
    token: SECRET_TOKEN,
    note: "private note",
    attributes: { secret: "attr" },
    item_count: quantity,
    items:
      quantity === 0
        ? []
        : [{ variant_id: 101, quantity, properties: { private: SECRET_TOKEN }, key: "101:x" }],
  });
};

function json(response: ServerResponse, body: unknown) {
  response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
}

const page = (script = "") => `<!doctype html><title>Store</title>${script}
<button id="add">Add to cart</button>
<script>
  // A trap: the reader must never call the Standard Action.
  window.Shopify = Object.assign(window.Shopify || {}, {
    actions: { getCart: () => { window.getCartCalled = true; return { cart: { id: "x", totalQuantity: 99 } }; } },
  });
  document.getElementById("add").onclick = () => fetch("/add", { method: "POST" });
</script>`;
const routesRoot = (root: unknown) =>
  `<script>window.Shopify = { routes: { root: ${JSON.stringify(root)} } };</script>`;

function route(request: IncomingMessage, response: ServerResponse) {
  const path = new URL(request.url ?? "/", "http://fixture").pathname;
  if (path.endsWith("/cart.js")) {
    cartRequests.push({ path, cookie: sessionId(request) !== undefined });
    return (cartHandler ?? defaultCart)(request, response);
  }
  if (path === "/add") {
    const id = sessionId(request) ?? randomUUID();
    carts.set(id, (carts.get(id) ?? 0) + 1);
    return void response
      .writeHead(204, { "set-cookie": `fixture_sid=${id}; HttpOnly; Path=/; SameSite=Lax` })
      .end();
  }
  const pages: Record<string, string> = {
    "/products/tee": page(),
    "/en-ca/products/tee": page(routesRoot("/en-ca/")),
    "/en-ca/plain/tee": page(),
    "/root/cross-origin": page(routesRoot("https://evil.example/")),
    "/root/protocol-relative": page(routesRoot("//evil.example/")),
    "/root/number": page(routesRoot(5)),
  };
  const html = pages[path];
  if (html === undefined) return void response.writeHead(404).end();
  response.writeHead(200, { "content-type": "text/html" }).end(html);
}

beforeAll(async () => {
  server = createServer(route);
  other = createServer((_request, response) => {
    otherHits++;
    json(response, { item_count: 1, items: [{ variant_id: 101, quantity: 1 }] });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  await new Promise<void>((resolve) => other.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  otherOrigin = `http://127.0.0.1:${(other.address() as AddressInfo).port}`;
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-cart-"));
});

afterEach(() => {
  cartHandler = undefined;
  cartRequests.length = 0;
  otherHits = 0;
});

afterAll(async () => {
  await Promise.all(sessions.map(async (session) => session.close()));
  for (const target of [server, other]) {
    target.closeAllConnections();
    await new Promise((resolve) => target.close(resolve));
  }
  await rm(workDir, { recursive: true, force: true });
});

async function openSession(path = "/products/tee"): Promise<BrowserSession> {
  const session = await createBrowserSession({
    baseUrl: `${origin}/`,
    artifactDirectory: workDir,
    onEvidence: () => {},
  });
  sessions.push(session);
  await session.page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
  return session;
}

const signal = () => new AbortController().signal;

async function readError(promise: Promise<unknown>): Promise<CartReadError> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  assert.ok(error instanceof CartReadError, String(error));
  return error;
}

describe("readCart", () => {
  it("reads the cart that the UI added in this browser session, and nothing private", async () => {
    const buyer = await openSession();
    await buyer.page.click("#add");
    await buyer.page.waitForResponse((response) => response.url().endsWith("/add"));

    const cart = await readCart(buyer.page, new URL(`${origin}/`), signal());

    assert.deepEqual(cart, {
      endpoint: `${origin}/cart.js`,
      totalQuantity: 1,
      lines: [{ variantId: "gid://shopify/ProductVariant/101", quantity: 1 }],
    });
    assert.doesNotMatch(JSON.stringify(cart), /fixtureSecret|private|attr|101:x/);
    // The browser sent its own session cookie; the Standard Action was never called.
    assert.deepEqual(cartRequests, [{ path: "/cart.js", cookie: true }]);
    assert.equal(await buyer.page.evaluate(() => Reflect.get(window, "getCartCalled")), undefined);

    // A second, fresh browser has no cookie and sees an empty cart: no session bleed.
    const fresh = await openSession();
    assert.deepEqual(await readCart(fresh.page, new URL(`${origin}/`), signal()), {
      endpoint: `${origin}/cart.js`,
      totalQuantity: 0,
      lines: [],
    });
    assert.deepEqual(cartRequests.at(-1), { path: "/cart.js", cookie: false });
  });

  it("uses window.Shopify.routes.root when set, else the supplied base path, never the page path", async () => {
    const session = await openSession("/en-ca/products/tee");
    await readCart(session.page, new URL(`${origin}/`), signal());
    await session.page.goto(`${origin}/en-ca/plain/tee`);
    await readCart(session.page, new URL(`${origin}/en-ca`), signal());
    await session.page.goto(`${origin}/products/tee`);
    await readCart(session.page, new URL(`${origin}/`), signal());

    assert.deepEqual(
      cartRequests.map((request) => request.path),
      ["/en-ca/cart.js", "/en-ca/cart.js", "/cart.js"],
    );
  });

  it("refuses a cross-origin or malformed root, and a redirect, with no request elsewhere", async () => {
    const session = await openSession();
    for (const path of ["/root/cross-origin", "/root/protocol-relative", "/root/number"]) {
      await session.page.goto(`${origin}${path}`);
      const error = await readError(readCart(session.page, new URL(`${origin}/`), signal()));
      assert.deepEqual(
        [error.code, error.message],
        ["unavailable", "The page sets an unsupported window.Shopify.routes.root."],
        path,
      );
    }
    assert.deepEqual(cartRequests, []);

    await session.page.goto(`${origin}/products/tee`);
    cartHandler = (_request, response) =>
      void response.writeHead(302, { location: `${otherOrigin}/cart.js` }).end();
    const error = await readError(readCart(session.page, new URL(`${origin}/`), signal()));
    assert.deepEqual(
      [error.code, error.message],
      ["request-failed", "The cart JSON endpoint redirected; the redirect was not followed."],
    );
    assert.equal(otherHits, 0);
  });

  it("reports HTTP errors, non-JSON, and invalid cart shapes as read errors", async () => {
    const session = await openSession();
    const read = () => readError(readCart(session.page, new URL(`${origin}/`), signal()));
    for (const status of [403, 404, 500]) {
      cartHandler = (_request, response) => void response.writeHead(status).end("no");
      const error = await read();
      assert.deepEqual(
        [error.code, error.httpStatus, error.message],
        ["request-failed", status, `The cart JSON endpoint answered HTTP ${status}.`],
      );
    }
    cartHandler = (_request, response) =>
      void response.writeHead(200, { "content-type": "text/html" }).end("<p>Cart</p>");
    const notJson = await read();
    assert.deepEqual(
      [notJson.code, notJson.message],
      ["invalid-response", "The cart JSON response is not JSON."],
    );

    for (const body of [
      [],
      { item_count: 1 },
      { item_count: 1, items: [{ variant_id: 101, quantity: -1 }] },
      { item_count: 1, items: [{ variant_id: 101, quantity: 1.5 }] },
      { item_count: 1, items: [{ variant_id: 101, quantity: "1" }] },
      { item_count: 1, items: [{ variant_id: 101, quantity: 0 }] },
      { item_count: 1, items: [{ variant_id: 0, quantity: 1 }] },
      { item_count: 1, items: [{ variant_id: 2 ** 53, quantity: 1 }] },
      { item_count: 1, items: [{ variant_id: "gid://shopify/ProductVariant/1", quantity: 1 }] },
      { item_count: 1, items: [{ variant_id: { id: 1 }, quantity: 1 }] },
      { item_count: 1, items: [null] },
      { items: [{ variant_id: 101, quantity: 1 }] },
      { item_count: -1, items: [] },
    ]) {
      cartHandler = (_request, response) => json(response, body);
      const error = await read();
      assert.deepEqual(
        [error.code, error.message],
        ["invalid-response", "The cart JSON response does not have the expected cart shape."],
        JSON.stringify(body),
      );
    }

    // A decimal-string ID is a variant ID too, with no precision lost.
    cartHandler = (_request, response) =>
      json(response, { item_count: 2, items: [{ variant_id: "9007199254740993", quantity: 2 }] });
    const cart = await readCart(session.page, new URL(`${origin}/`), signal());
    assert.deepEqual(cart.lines, [
      { variantId: "gid://shopify/ProductVariant/9007199254740993", quantity: 2 },
    ]);
  });

  it("times out a hanging response or body, and lets an abort win at once", async () => {
    const session = await openSession();
    cartHandler = () => {};
    let error = await readError(readCart(session.page, new URL(`${origin}/`), signal(), 300));
    assert.deepEqual(
      [error.code, error.message],
      ["timeout", "The cart JSON did not arrive within 300 ms."],
    );

    cartHandler = (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.write('{"items":[');
    };
    error = await readError(readCart(session.page, new URL(`${origin}/`), signal(), 300));
    assert.equal(error.code, "timeout");

    cartHandler = () => {};
    const controller = new AbortController();
    const reason = new Error("SIGINT");
    setTimeout(() => controller.abort(reason), 50);
    const started = Date.now();
    await assert.rejects(readCart(session.page, new URL(`${origin}/`), controller.signal), reason);
    assert.ok(Date.now() - started < 2_000);
  });

  it("does not read from a page that is not a storefront page", async () => {
    const session = await openSession();
    await session.page.goto("about:blank");
    const error = await readError(readCart(session.page, new URL(`${origin}/`), signal()));
    assert.deepEqual(
      [error.code, error.message],
      ["unavailable", "The current page is not a storefront page, so the cart JSON was not read."],
    );
    assert.deepEqual(cartRequests, []);
  });
});
