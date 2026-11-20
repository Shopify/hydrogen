import type { ViewEventElement } from "../../../vendor/standard-events";
import { importStandardEventsFromCDN } from "./standard-events";

const PAYLOAD = "view-event-payload";
const TRIGGER = "view-event-trigger";

type ViewEventElementClass = (new () => HTMLElement &
  ViewEventElement & {
    connectedCallback?(): void;
    disconnectedCallback?(): void;
    attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
  }) & { observedAttributes?: string[] };

const defined = new Set<string>();

/**
 * Registers a Standard Events view custom element in the browser. It extends Shopify's
 * `createViewEventElement()` so the element sends the event again when `getKey` returns a new
 * value for `view-event-payload`. A `connect` element sends only while it is shown, and sends again
 * each time it is shown after it was hidden while connected. Does nothing on the server and ignores
 * load or define failures.
 */
export function defineViewEventElement<Payload>(
  tagName: string,
  getKey: (payload: Payload) => unknown,
): void {
  if (typeof customElements === "undefined" || defined.has(tagName)) return;
  defined.add(tagName);
  void importStandardEventsFromCDN()
    .then(({ createViewEventElement }) => {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, sendAgainOnKeyChange(createViewEventElement(), getKey));
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

function sendAgainOnKeyChange<Payload>(
  Base: ViewEventElementClass,
  getKey: (payload: Payload) => unknown,
) {
  // Payloads that are missing, don't parse, or have no key return undefined.
  const keyOf = (value: string | null) => {
    if (value === null) return undefined;
    try {
      return getKey(JSON.parse(value));
    } catch {
      return undefined;
    }
  };

  // One observer per element class, like the base element's IntersectionObserver.
  let visibilityObserver: ResizeObserver | undefined;

  return class ViewEventElementWithKey extends Base {
    static observedAttributes = [...(Base.observedAttributes ?? []), PAYLOAD];

    #lastDispatchedKey: unknown;
    #dialogDispatchedKey: unknown;
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
      const key = this.isConnected ? keyOf(this.getAttribute(PAYLOAD)) : undefined;
      if (key != null) {
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
      if (name !== PAYLOAD || !this.isConnected) return;
      // Before the first view, the base element is still waiting to send with the latest payload.
      if (this.#lastDispatchedKey === undefined) return;

      const key = keyOf(newValue);
      if (key == null || key === this.#lastDispatchedKey) return;

      // A new item: restart the base element's own trigger, so it sends the new payload at the
      // same moment it sent the first one (on connect, when half visible, or when the dialog opens).
      super.disconnectedCallback?.();
      super.connectedCallback?.();
    }
  };
}
