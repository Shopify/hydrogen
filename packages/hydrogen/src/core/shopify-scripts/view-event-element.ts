import type { ViewEventElement } from "../../../vendor/standard-events";
import { importStandardEventsFromCDN } from "./standard-events";

const PAYLOAD = "view-event-payload";
const TRIGGER = "view-event-trigger";
const INTERSECT_THRESHOLD = 0.5;

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
 * value for `view-event-payload`. Does nothing on the server and ignores load or define failures.
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

function sendAgainOnKeyChange<Payload>(
  Base: ViewEventElementClass,
  getKey: (payload: Payload) => unknown,
) {
  let observer: IntersectionObserver | undefined;
  const pending = new Map<Element, () => void>();

  const unobserve = (element: Element) => {
    if (!pending.delete(element)) return;
    observer?.unobserve(element);
    if (pending.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };

  const observeWhenVisible = (element: Element, dispatch: () => void) => {
    if (typeof IntersectionObserver === "undefined") {
      dispatch();
      return;
    }
    pending.set(element, dispatch);
    observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < INTERSECT_THRESHOLD) continue;
          const send = pending.get(entry.target);
          unobserve(entry.target);
          send?.();
        }
      },
      { threshold: INTERSECT_THRESHOLD },
    );
    observer.observe(element);
  };

  const dispatchForTrigger = (element: HTMLElement, dispatch: () => void) => {
    const trigger = element.getAttribute(TRIGGER);
    if (trigger === "manual") return;
    if (trigger === "intersect") {
      observeWhenVisible(element, dispatch);
      return;
    }
    const dialog = getDialog(element);
    if (trigger === "dialog" || dialog !== null) {
      if (dialog?.open) dispatch();
      return;
    }
    dispatch();
  };

  // Payloads that are missing, don't parse, or have no key return undefined.
  const keyOf = (value: string | null) => {
    if (value === null) return undefined;
    try {
      return getKey(JSON.parse(value));
    } catch {
      return undefined;
    }
  };

  return class extends Base {
    static observedAttributes = [...(Base.observedAttributes ?? []), PAYLOAD];

    #lastDispatchedKey: unknown;
    #dialogDispatchedKey: unknown;
    #dialogAbort: AbortController | undefined;

    connectedCallback() {
      super.connectedCallback?.();
      const dialog = getDialog(this);
      if (!dialog) return;
      this.#dialogAbort = new AbortController();
      const resetOnClose = () => {
        if (!dialog.open) this.#dialogDispatchedKey = undefined;
      };
      dialog.addEventListener("toggle", resetOnClose, { signal: this.#dialogAbort.signal });
      dialog.addEventListener("close", resetOnClose, { signal: this.#dialogAbort.signal });
    }

    dispatchViewEvent() {
      const key = this.isConnected ? keyOf(this.getAttribute(PAYLOAD)) : undefined;
      if (key != null) {
        const dialogOpen = getDialog(this)?.open === true;
        // Skip a duplicate send for the same key during one dialog opening (for example,
        // the queued `toggle` event after `showModal()` or after mounting during an open).
        if (dialogOpen && this.#dialogDispatchedKey === key) return;
        this.#lastDispatchedKey = key;
        if (dialogOpen) this.#dialogDispatchedKey = key;
      }
      super.dispatchViewEvent();
    }

    disconnectedCallback() {
      this.#dialogAbort?.abort();
      this.#dialogAbort = undefined;
      this.#dialogDispatchedKey = undefined;
      unobserve(this);
      this.#lastDispatchedKey = undefined;
      super.disconnectedCallback?.();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
      super.attributeChangedCallback?.(name, oldValue, newValue);
      if (name !== PAYLOAD || !this.isConnected) return;
      // Before the first view, the base element is still waiting to send with the latest payload.
      if (this.#lastDispatchedKey === undefined) return;

      const key = keyOf(newValue);
      // A missing key, or a return to the key already sent, cancels a pending visibility send.
      if (key == null || key === this.#lastDispatchedKey) {
        unobserve(this);
        return;
      }

      dispatchForTrigger(this, () => this.dispatchViewEvent());
    }
  };
}
