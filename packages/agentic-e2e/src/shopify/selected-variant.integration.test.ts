import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserSession, type BrowserSession } from "../browser/session.ts";
import { observeSelectedVariant, VARIANT_FIELD_TIMEOUT_MS } from "./selected-variant.ts";

// Real headless Chromium against pages served through Playwright routing. The pages change the
// current values of their fields in scripts, after the HTML is parsed, as a hydrated storefront
// can.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const ORIGIN = "http://fixture.test";
const MEDIUM = "gid://shopify/ProductVariant/21";
const LARGE = "gid://shopify/ProductVariant/22";
const VARIANT_IDS = [MEDIUM, LARGE];

let session: BrowserSession;
let html: string;
const never = new AbortController().signal;

beforeAll(async () => {
  session = await createBrowserSession();
  await session.page.route(`${ORIGIN}/**`, async (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: html }),
  );
});

afterAll(async () => {
  await session.close();
});

beforeEach(() => {
  html = "";
});

async function open(body: string) {
  html = `<!doctype html><title>Tee</title><h1>Tee</h1>${body}`;
  await session.page.goto(`${ORIGIN}/products/tee`, { waitUntil: "domcontentloaded" });
}

async function observe(body: string) {
  await open(body);
  return observeSelectedVariant(session.page, VARIANT_IDS, never);
}

describe("observeSelectedVariant in a browser", () => {
  // A hidden input's `value` also sets its attribute, so this proves the read after the script,
  // not the property over the attribute. The Liquid select test proves that.
  it("reads the merchandiseId value that a module script sets after the HTML is parsed", async () => {
    const selection = await observe(`
      <form method="post" action="/cart">
        <input type="hidden" name="merchandiseId" value="${MEDIUM}">
        <button>Add to cart</button>
      </form>
      <script type="module">
        document.querySelector('[name="merchandiseId"]').value = ${JSON.stringify(LARGE)};
      </script>`);

    expect(selection).toEqual({ status: "selected", variantId: LARGE });
  });

  it("waits for a product form that a script renders after the page loads", async () => {
    const selection = await observe(`
      <main></main>
      <script>
        setTimeout(() => {
          document.querySelector("main").innerHTML =
            '<form action="/cart"><input type="hidden" name="merchandiseId" value=${JSON.stringify(MEDIUM)}><button>Add</button></form>';
        }, 300);
      </script>`);

    expect(selection).toEqual({ status: "selected", variantId: MEDIUM });
  });

  // No option has a `selected` attribute after the script: only the current value holds 22.
  it("reads the current value of a Liquid id select and ignores other forms", async () => {
    const selection = await observe(`
      <form method="post" action="/fr/cart/add">
        <select name="id">
          <option value="21">Medium</option>
          <option value="22">Large</option>
        </select>
        <button>Add to cart</button>
      </form>
      <form action="/contact"><input name="id" value="21"><button>Send</button></form>
      <form action="/cart"><input type="hidden" name="id" value="21"></form>
      <form action="/cart/add" style="display: none"><input type="hidden" name="id" value="21"></form>
      <div style="visibility: hidden">
        <form action="/cart/add"><input type="hidden" name="id" value="21"></form>
      </div>
      <input type="hidden" name="merchandiseId" value="${MEDIUM}">
      <section aria-label="Recommended products">
        <form action="/cart/add"><input type="hidden" name="id" value="99"><button>Add</button></form>
      </section>
      <script>document.querySelector('select[name="id"]').value = "22";</script>`);

    expect(selection).toEqual({ status: "selected", variantId: LARGE });
  });

  it("reads the Liquid id controls that the cart form owns through form=, not by position", async () => {
    // The cart form owns the outside select. The input inside it belongs to the newsletter form,
    // and a control named `elements` must not hide the form's controls.
    const selection = await observe(`
      <form id="product-form" method="post" action="/cart/add">
        <input type="hidden" name="id" value="21" form="newsletter">
        <input type="hidden" name="elements" value="x">
        <button>Add to cart</button>
      </form>
      <form id="newsletter" action="/contact"><button>Subscribe</button></form>
      <select name="id" form="product-form" hidden>
        <option value="21">Medium</option>
        <option value="22">Large</option>
      </select>
      <input type="hidden" name="id" value="21" form="newsletter">
      <script>document.querySelector('select[name="id"]').value = "22";</script>`);

    expect(selection).toEqual({ status: "selected", variantId: LARGE });
  });

  it("reads an outside Liquid id input tied with form= to the cart form", async () => {
    const selection = await observe(`
      <form id="product-form" method="post" action="/cart/add"><button>Add to cart</button></form>
      <input type="hidden" name="id" value="21" form="product-form">`);

    expect(selection).toEqual({ status: "selected", variantId: MEDIUM });
  });

  it("accepts a Hydrogen field and a Liquid field that agree", async () => {
    const selection = await observe(`
      <form action="/cart"><input type="hidden" name="merchandiseId" value="${LARGE}"></form>
      <form action="/cart/add"><input type="hidden" name="id" value="22"></form>`);

    expect(selection).toEqual({ status: "selected", variantId: LARGE });
  });

  it("is unknown when visible product forms select different variants", async () => {
    const selection = await observe(`
      <form action="/cart/add"><input type="hidden" name="id" value="21"><button>Add</button></form>
      <form action="/cart/add"><input type="hidden" name="id" value="22"><button>Add</button></form>`);

    expect(selection).toEqual({
      status: "unknown",
      reason: `The selected variant is unknown: Product forms hold different variants of the product: ${MEDIUM}, ${LARGE}.`,
    });
  });

  it("is unknown when the page has more variant fields than the limit, even when they agree", async () => {
    const form = `<form action="/cart/add"><input type="hidden" name="id" value="21"></form>`;
    const selection = await observe(form.repeat(51));

    expect(selection).toEqual({
      status: "unknown",
      reason:
        "The selected variant is unknown: The page has more than 50 product form variant fields, or invalid ones.",
    });
  });

  it("is unknown when the merchandiseId field is empty", async () => {
    const selection = await observe(`
      <form action="/cart"><input type="hidden" name="merchandiseId" value="${MEDIUM}"></form>
      <script>document.querySelector('[name="merchandiseId"]').value = "";</script>`);

    expect(selection).toEqual({
      status: "unknown",
      reason:
        'The selected variant is unknown: A product form merchandiseId field holds "", which is not a variant ID.',
    });
  });

  it("is unknown when only another product's form is found", async () => {
    const selection = await observe(
      `<form action="/cart/add"><input type="hidden" name="id" value="99"></form>`,
    );

    expect(selection).toEqual({
      status: "unknown",
      reason:
        "The selected variant is unknown: No product form holds the ID of an examined variant of the product.",
    });
  });

  it("is unknown after the timeout when no recognized field is in a visible form", async () => {
    const started = performance.now();
    const selection = await observe(`
      <input type="hidden" name="merchandiseId" value="${MEDIUM}">
      <form action="/cart"><input type="hidden" name="id" value="21"></form>
      <form action="/cart/add"><input type="hidden" name="variant" value="21"></form>`);

    expect(selection).toEqual({
      status: "unknown",
      reason: `The selected variant is unknown: No product form variant field was found in ${VARIANT_FIELD_TIMEOUT_MS} ms.`,
    });
    expect(performance.now() - started).toBeGreaterThanOrEqual(VARIANT_FIELD_TIMEOUT_MS);
  });

  it("throws the interrupt reason while it waits", async () => {
    const controller = new AbortController();
    await open("<p>No form.</p>");
    const observing = observeSelectedVariant(session.page, VARIANT_IDS, controller.signal);
    controller.abort(new Error("Interrupted by SIGINT."));

    await expect(observing).rejects.toThrow("Interrupted by SIGINT.");
  });
});
