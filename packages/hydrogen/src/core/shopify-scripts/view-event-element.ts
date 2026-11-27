import { importStandardEventsFromCDN } from "./standard-events";

/**
 * Tag name of the Standard Events view custom element, `shopify-view-event`.
 *
 * Use the tag with the attributes from a helper such as `getProductViewAttributes` on a framework
 * without a Hydrogen binding.
 *
 * @publicDocs
 */
export const VIEW_EVENT_TAG_NAME = "shopify-view-event";

let defined = false;

/**
 * @internal Registers Shopify's view event element as `VIEW_EVENT_TAG_NAME` in the browser. The function
 * loads Shopify's Standard Events module and does nothing on the server. `initializeShopifyScripts`
 * calls it.
 *
 * The module loads right away, but the element registers after `DOMContentLoaded`. Streaming SSR
 * runs scripts while the document is loading, and deferred listeners, such as the Standard Events
 * inspector and `shopify:page:view`, attach by `DOMContentLoaded`, so earlier view events would be missed.
 */
export function defineViewEventElement(): void {
  if (typeof customElements === "undefined" || defined) return;
  defined = true;
  void importStandardEventsFromCDN()
    .then(({ createViewEventElement }) => {
      const register = () => {
        try {
          if (!customElements.get(VIEW_EVENT_TAG_NAME)) {
            customElements.define(VIEW_EVENT_TAG_NAME, createViewEventElement());
          }
        } catch {
          // The listener runs outside the promise chain, so it ignores errors here.
        }
      };
      if (typeof document !== "undefined" && document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", register, { once: true });
      } else {
        register();
      }
    })
    .catch(() => {});
}
