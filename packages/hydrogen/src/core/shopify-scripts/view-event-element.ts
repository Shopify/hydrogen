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
 */
export function defineViewEventElement(): void {
  if (typeof customElements === "undefined" || defined) return;
  defined = true;
  void importStandardEventsFromCDN()
    .then(({ createViewEventElement }) => {
      if (!customElements.get(VIEW_EVENT_TAG_NAME)) {
        customElements.define(VIEW_EVENT_TAG_NAME, createViewEventElement());
      }
    })
    .catch(() => {});
}
