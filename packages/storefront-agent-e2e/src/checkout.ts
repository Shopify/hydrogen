import type { BrowserContext, Page } from "@playwright/test";

export const CHECKOUT_STUB_HEADING = "Checkout reached";

const CHECKOUT_STUB_HTML = `<!doctype html><html lang="en"><head><title>Checkout</title></head>
<body><main><h1>${CHECKOUT_STUB_HEADING}</h1>
<p>The storefront handed off to checkout. Nothing else to do on this page.</p></main></body></html>`;

// Only checkout-shaped documents are paused, so the rest of the page loads untouched.
const CHECKOUT_DOCUMENT_PATTERNS = ["*/cart/c/*", "*/checkouts/*"].map((urlPattern) => ({
  urlPattern,
  resourceType: "Document" as const,
  requestStage: "Request" as const,
}));

export type CheckoutCapture = {
  /** The first checkout URL the storefront handed off to, or null if it never did. */
  readonly url: () => string | null;
};

// Every Shopify cart hands off through cart.checkoutUrl, often behind redirects: Shop Pay goes
// to the storefront's own /checkout route, which redirects into /cart/c/. Playwright routes never
// see redirect hops, but CDP Fetch pauses every hop, so use it directly in every tab. The first
// top-level checkout document is recorded and replaced with a stub, so nothing irreversible
// happens and the agent can see it arrived.
export async function captureCheckout(context: BrowserContext): Promise<CheckoutCapture> {
  let firstUrl: string | null = null;

  const watch = async (page: Page) => {
    // Fallback for a new tab whose first navigation beats Fetch.enable below: still record it.
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame() && isCheckoutPath(new URL(frame.url()).pathname)) {
        firstUrl ??= frame.url();
      }
    });
    const session = await context.newCDPSession(page);
    const { frameTree } = await session.send("Page.getFrameTree");
    const topFrameId = frameTree.frame.id;
    session.on("Fetch.requestPaused", (event) => {
      const isTopLevel = event.frameId === topFrameId;
      if (!isTopLevel) {
        void session.send("Fetch.continueRequest", { requestId: event.requestId }).catch(() => {});
        return;
      }
      firstUrl ??= event.request.url;
      void session
        .send("Fetch.fulfillRequest", {
          requestId: event.requestId,
          responseCode: 200,
          responseHeaders: [{ name: "content-type", value: "text/html; charset=utf-8" }],
          body: Buffer.from(CHECKOUT_STUB_HTML).toString("base64"),
        })
        .catch(() => {});
    });
    await session.send("Fetch.enable", { patterns: CHECKOUT_DOCUMENT_PATTERNS });
  };

  await Promise.all(context.pages().map(watch));
  context.on("page", (page) => void watch(page).catch(() => {}));
  return { url: () => firstUrl };
}

function isCheckoutPath(pathname: string): boolean {
  return pathname.startsWith("/cart/c/") || pathname.startsWith("/checkouts/");
}

/** Removes cart keys (bearer secrets) from URLs, cart ids, or error text. */
export function redactCartKeys(text: string): string {
  return text.replaceAll(/([?&]key=)[^&\s"']+/g, "$1<redacted>");
}
