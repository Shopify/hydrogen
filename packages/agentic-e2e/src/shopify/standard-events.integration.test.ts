import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { chromium, type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseStandardEventMessage, standardEventsRecorderScript } from "./standard-events.ts";

const BINDING = "__standardEventsTest";
const recorder = standardEventsRecorderScript(BINDING, ["shopify:cart:lines-update"]);

type TestGlobals = {
  realm: string;
  firstDocument: Document;
  messages: string[];
  popupArm?: unknown;
  done?: unknown;
};

/** Marks the realm, collects binding messages, and runs the recorder. */
const install = `(() => {
  globalThis.realm = Math.random().toString(36);
  globalThis.firstDocument = document;
  globalThis.messages = [];
  globalThis[${JSON.stringify(BINDING)}] = (text) => messages.push(text);
  return ${recorder};
})()`;

/**
 * Dispatches an official-shape add on `window`, then on the document, then on an element with
 * `bubbles: false`. Only the document and element events must be recorded.
 */
const dispatchAdds = `(() => {
  const add = (bubbles) => {
    const event = new Event("shopify:cart:lines-update", { bubbles });
    return Object.assign(event, {
      action: "add",
      context: "product",
      lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
      promise: Promise.resolve({ userErrors: [] }),
    });
  };
  const button = document.body.appendChild(document.createElement("button"));
  const events = [add(true), add(true), add(false)];
  window.dispatchEvent(events[0]);
  document.dispatchEvent(events[1]);
  button.dispatchEvent(events[2]);
  globalThis.done = Promise.all(events.map((event) => event.promise)).then(
    () => new Promise((resolve) => setTimeout(resolve)),
  );
})()`;

/** The document and element adds, each with one input and one outcome. */
const RECORDED_ADDS = [
  ["add input", "add settled"],
  ["add input", "add settled"],
];

let server: Server;
let origin: string;
let browser: Browser;
let releasePopup: () => void = () => {};

beforeAll(async () => {
  const popupReleased = new Promise<void>((resolve) => (releasePopup = resolve));
  server = createServer(async (request, response) => {
    // The popup response waits until its initial about:blank document is armed.
    if (request.url === "/popup") await popupReleased;
    const script =
      request.url === "/popup" ? `globalThis.popupArm = ${recorder};${dispatchAdds}` : "";
    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<!doctype html><title>Recorder</title><body><script>${script}</script>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome" });
}, 30_000);

afterAll(async () => {
  await browser?.close();
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
});

async function openPage(): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(origin);
  return page;
}

/** Waits for the dispatched promises, then returns and clears the recorded phases by event ID. */
async function takeEvents(page: Page): Promise<string[][]> {
  const texts = await page.evaluate(async () => {
    const test = globalThis as unknown as TestGlobals;
    await test.done;
    return test.messages.splice(0);
  });
  const events = new Map<string | undefined, string[]>();
  for (const text of texts) {
    const event = parseStandardEventMessage(text)?.data.event;
    events.set(event?.id, [...(events.get(event?.id) ?? []), `${event?.action} ${event?.phase}`]);
  }
  return [...events.values()];
}

describe("standardEventsRecorderScript in Chrome", () => {
  it("records document and element events once and ignores direct window events", async () => {
    const page = await openPage();

    expect(await page.evaluate(install)).toEqual({ fresh: true, url: `${origin}/` });
    // Arming the same document again must not add a second listener.
    expect(await page.evaluate(recorder)).toEqual({ fresh: false, url: `${origin}/` });
    await page.evaluate(dispatchAdds);

    expect(await takeEvents(page)).toEqual(RECORDED_ADDS);
    await page.close();
  });

  it("records again after document.open() removes the listeners", async () => {
    const page = await openPage();
    await page.evaluate(install);
    await page.evaluate(() => {
      document.open();
      document.write("<!doctype html><title>Written</title><body>");
      document.close();
    });

    await page.evaluate(dispatchAdds);
    expect(await takeEvents(page)).toEqual([]);

    // The document is the same, so it is not fresh, but the listeners must come back.
    expect(await page.evaluate(recorder)).toEqual({ fresh: false, url: `${origin}/` });
    await page.evaluate(dispatchAdds);
    expect(await takeEvents(page)).toEqual(RECORDED_ADDS);
    await page.close();
  });

  it("re-arms a popup document that replaces about:blank in the same realm", async () => {
    const page = await openPage();
    const popupEvent = page.waitForEvent("popup");
    const initial = await page.evaluate(
      ({ url, code }) => {
        const popup = window.open(url) as unknown as { eval(code: string): unknown };
        return { arm: popup.eval(code), realm: popup.eval("globalThis.realm") };
      },
      { url: `${origin}/popup`, code: install },
    );
    const popup = await popupEvent;
    expect(initial.arm).toEqual({ fresh: true, url: "about:blank" });

    releasePopup();
    await popup.waitForURL(`${origin}/popup`);

    // The page script re-ran the recorder before it dispatched its events.
    expect(
      await popup.evaluate(() => {
        const test = globalThis as unknown as TestGlobals;
        return {
          realm: test.realm,
          sameDocument: test.firstDocument === document,
          arm: test.popupArm,
        };
      }),
    ).toEqual({
      realm: initial.realm,
      sameDocument: false,
      arm: { fresh: true, url: `${origin}/popup` },
    });
    expect(await takeEvents(popup)).toEqual(RECORDED_ADDS);
    await page.close();
  });
});
