import type * as StandardEventsModule from "../../../vendor/standard-events";
import { SHOPIFY_PERF_KIT_SCRIPT_ID } from "./constants";
import { observeNavigation } from "./utils/navigation";

let cleanupPageViewEvents: (() => void) | undefined;

const getPageKey = () => `${window.location.pathname}${window.location.search}`;
const getPageTemplate = (url = window.location.href) =>
  window.Shopify?.routes?.match?.(url)?.pageTemplateName ?? "unknown";

// Keep this URL inline so consumer bundlers such as Vite recognize it as an external import.
const importStandardEventsFromCDN: () => Promise<
  Pick<typeof StandardEventsModule, "PageViewEvent">
> = () =>
  // @ts-expect-error CDN package without automatic types
  import("https://cdn.shopify.com/storefront/standard-events.js");

export function initializeShopifyPageViewEvents(
  importStandardEvents = importStandardEventsFromCDN,
) {
  if (cleanupPageViewEvents) return cleanupPageViewEvents;

  // Update the PerfKit script with the current page type since it
  // might miss the initial page view if it was loaded after the script.
  document
    .getElementById(SHOPIFY_PERF_KIT_SCRIPT_ID)
    ?.setAttribute("data-page-type", getPageTemplate());

  const standardEventsPromise = importStandardEvents().catch(() => undefined);
  let lastPageKey = getPageKey();
  let scheduledNavigation: number | undefined;

  const emitPageView = () => {
    const page = {
      template: getPageTemplate(),
      title: document.title,
      url: window.location.href,
    } satisfies StandardEventsModule.PageViewEvent["page"];

    void standardEventsPromise.then((StandardEvents) => {
      if (!StandardEvents) return;
      document.dispatchEvent(new StandardEvents.PageViewEvent({ page }));
    });
  };

  const stopObservingNavigation = observeNavigation(() => {
    const pageKey = getPageKey();
    if (pageKey === lastPageKey) return;

    lastPageKey = pageKey;
    if (scheduledNavigation !== undefined) {
      cancelAnimationFrame(scheduledNavigation);
    }
    scheduledNavigation = requestAnimationFrame(() => {
      scheduledNavigation = undefined;
      emitPageView();
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", emitPageView, { once: true });
  } else {
    emitPageView();
  }

  cleanupPageViewEvents = () => {
    document.removeEventListener("DOMContentLoaded", emitPageView);
    stopObservingNavigation();
    if (scheduledNavigation !== undefined) cancelAnimationFrame(scheduledNavigation);
    cleanupPageViewEvents = undefined;
  };

  return cleanupPageViewEvents;
}
