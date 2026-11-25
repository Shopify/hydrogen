import type { ViewEventElement } from "../../../vendor/standard-events";
import { importStandardEventsFromCDN } from "./standard-events";

const PAYLOAD = "view-event-payload";
const TRIGGER = "view-event-trigger";
const KEY = "view-event-key";

/**
 * Tag name of the Standard Events view custom element, `shopify-view-event`.
 *
 * Use the tag with the attributes from a helper such as `getProductViewAttributes` on a framework
 * without a Hydrogen binding.
 *
 * @publicDocs
 */
export const VIEW_EVENT_TAG_NAME = "shopify-view-event";

type ViewEventElementClass = (new () => HTMLElement &
  ViewEventElement & {
    connectedCallback?(): void;
    disconnectedCallback?(): void;
    attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
  }) & { observedAttributes?: string[] };

let defined = false;

/**
 * Registers the `VIEW_EVENT_TAG_NAME` custom element in the browser. The function loads Shopify's
 * Standard Events module and does nothing on the server. `initializeShopifyScripts` and the
 * `ShopifyScripts` component call it for you. Call it yourself only when you use neither.
 *
 * The element extends Shopify's view event element. It sends the event again when the
 * `view-event-key` attribute changes to a new value. Without a key, it sends once each time it
 * connects. A `connect` element sends only while it is shown, and sends again each time it is shown
 * after it was hidden while connected.
 *
 * @publicDocs
 */
export function defineViewEventElement(): void {
  if (typeof customElements === "undefined" || defined) return;
  defined = true;
  void importStandardEventsFromCDN()
    .then(({ createViewEventElement }) => {
      if (!customElements.get(VIEW_EVENT_TAG_NAME)) {
        customElements.define(VIEW_EVENT_TAG_NAME, sendAgainOnKeyChange(createViewEventElement()));
      }
    })
    .catch(() => {});
}

// Matches Shopify's createViewEventElement: no trigger inside a <dialog> uses dialog mode.
function getDialog(element: HTMLElement): HTMLDialogElement | null {
  const trigger = element.getAttribute(TRIGGER);
  return !trigger || trigger === "dialog" ? element.closest("dialog") : null;
}

// Matches Shopify's createViewEventElement: outside a dialog, a missing or unknown trigger is `connect`.
function sendsOnConnect(element: HTMLElement): boolean {
  const trigger = element.getAttribute(TRIGGER);
  return (
    !getDialog(element) && trigger !== "intersect" && trigger !== "dialog" && trigger !== "manual"
  );
}

// Browsers without `checkVisibility()` count the element as shown, as before.
const isShown = (element: Element) => element.checkVisibility?.() ?? true;

// A missing or empty key returns undefined: the element then works like the base element.
const keyOf = (element: Element) => element.getAttribute(KEY) || undefined;

function sendAgainOnKeyChange(Base: ViewEventElementClass) {
  // One observer per element class, like the base element's IntersectionObserver.
  let visibilityObserver: ResizeObserver | undefined;

  return class ViewEventElementWithKey extends Base {
    static observedAttributes = [...(Base.observedAttributes ?? []), PAYLOAD, KEY];

    #lastDispatchedKey: string | undefined;
    #dialogDispatchedKey: string | undefined;
    #dialogAbort: AbortController | undefined;
    #watchesVisibility = false;
    #waitingToShow = false;

    connectedCallback() {
      super.connectedCallback?.();
      // A `connect` element can stay connected while hidden, such as a page that Next.js keeps in
      // a hidden <Activity> for Back and Forward. It sends only while shown, and each new showing
      // is a new view. A ResizeObserver reports when an element starts or stops rendering.
      if (sendsOnConnect(this) && typeof ResizeObserver !== "undefined") {
        this.#watchesVisibility = true;
        visibilityObserver ??= new ResizeObserver((entries) => {
          for (const { target } of entries) {
            if (target instanceof ViewEventElementWithKey) target.#visibilityChanged();
          }
        });
        visibilityObserver.observe(this);
      }
      const dialog = getDialog(this);
      if (!dialog) return;
      this.#dialogAbort = new AbortController();
      const resetOnClose = () => {
        if (!dialog.open) this.#dialogDispatchedKey = undefined;
      };
      dialog.addEventListener("toggle", resetOnClose, { signal: this.#dialogAbort.signal });
      dialog.addEventListener("close", resetOnClose, { signal: this.#dialogAbort.signal });
    }

    #visibilityChanged() {
      if (!isShown(this)) {
        if (this.#lastDispatchedKey !== undefined) {
          this.#lastDispatchedKey = undefined;
          this.#waitingToShow = true;
        }
        return;
      }
      if (!this.#waitingToShow) return;
      this.#waitingToShow = false;
      this.dispatchViewEvent();
    }

    dispatchViewEvent() {
      if (this.#watchesVisibility && this.isConnected && !isShown(this)) {
        this.#waitingToShow = true;
        return;
      }
      const key = this.isConnected ? keyOf(this) : undefined;
      if (key !== undefined) {
        const dialogOpen = getDialog(this)?.open === true;
        // Re-arming and a dialog's queued `toggle` can both ask to send the item that was just
        // sent. Dialogs send once per opening; other triggers send once per item.
        const sentKey = dialogOpen ? this.#dialogDispatchedKey : this.#lastDispatchedKey;
        if (key === sentKey && this.getAttribute(TRIGGER) !== "manual") return;
        this.#lastDispatchedKey = key;
        if (dialogOpen) this.#dialogDispatchedKey = key;
      }
      super.dispatchViewEvent();
    }

    disconnectedCallback() {
      visibilityObserver?.unobserve(this);
      this.#watchesVisibility = false;
      this.#waitingToShow = false;
      this.#dialogAbort?.abort();
      this.#dialogAbort = undefined;
      this.#dialogDispatchedKey = undefined;
      this.#lastDispatchedKey = undefined;
      super.disconnectedCallback?.();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
      super.attributeChangedCallback?.(name, oldValue, newValue);
      if ((name !== PAYLOAD && name !== KEY) || !this.isConnected) return;
      // Before the first view, the base element is still waiting to send with the latest payload.
      if (this.#lastDispatchedKey === undefined) return;

      // Frameworks can set the key and the payload in either order. The base element reads the
      // payload when it sends, which is always later, so it sends the new payload. If both
      // changes restart it, the second send finds the key already sent and stops.
      const key = keyOf(this);
      if (key === undefined || key === this.#lastDispatchedKey) return;

      // A new item: restart the base element's own trigger, so it sends the new payload at the
      // same moment it sent the first one (on connect, when half visible, or when the dialog opens).
      super.disconnectedCallback?.();
      super.connectedCallback?.();
    }
  };
}
