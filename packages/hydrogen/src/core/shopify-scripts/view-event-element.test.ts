// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../vendor/standard-events";
import { assert } from "../test-utils";
import { VIEW_EVENT_TAG_NAME as TAG } from "./view-event-element";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("./standard-events", () => ({ importStandardEventsFromCDN }));

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

// Matches native dialog.showModal() / dialog.close(): `open` flips synchronously and `toggle` fires in the next task.
function openDialog(dialog: HTMLDialogElement) {
  dialog.open = true;
  setTimeout(() => dialog.dispatchEvent(new Event("toggle")));
}

function closeDialog(dialog: HTMLDialogElement) {
  dialog.open = false;
  setTimeout(() => {
    dialog.dispatchEvent(new Event("toggle"));
    dialog.dispatchEvent(new Event("close"));
  });
}

function makePayload(id: string, extra?: string) {
  return JSON.stringify({ id, extra });
}

// A stand-in for the browser's IntersectionObserver that the test drives by hand.
const io = {
  callback: undefined as IntersectionObserverCallback | undefined,
  options: undefined as IntersectionObserverInit | undefined,
  observed: new Set<Element>(),
  show(target: Element) {
    assert(io.callback, "expected an IntersectionObserver to be created");
    io.callback(
      [{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  },
};

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    io.callback = callback;
    io.options = options;
  }
  observe(target: Element) {
    io.observed.add(target);
  }
  unobserve(target: Element) {
    io.observed.delete(target);
  }
  disconnect() {
    io.observed.clear();
  }
}

// A stand-in for the browser's ResizeObserver and `checkVisibility()`, driven by hand. `hide` and
// `show` toggle what `checkVisibility()` returns and report the change like the browser does when
// an ancestor switches to and from `display: none`.
const ro = {
  callback: undefined as ResizeObserverCallback | undefined,
  observed: new Set<Element>(),
  hidden: new Set<Element>(),
  notify(target: Element) {
    if (!ro.observed.has(target)) return;
    assert(ro.callback, "expected a ResizeObserver to be created");
    ro.callback([{ target } as ResizeObserverEntry], {} as ResizeObserver);
  },
  hide(target: Element) {
    ro.hidden.add(target);
    ro.notify(target);
  },
  show(target: Element) {
    ro.hidden.delete(target);
    ro.notify(target);
  },
};

class FakeResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    ro.callback = callback;
  }
  observe(target: Element) {
    ro.observed.add(target);
  }
  unobserve(target: Element) {
    ro.observed.delete(target);
  }
  disconnect() {
    ro.observed.clear();
  }
}

// Mirrors the CDN createViewEventElement: `connect` sends one task after connecting, `dialog` sends
// if the dialog is already open and on each opening `toggle`, `intersect` sends the first time half
// of the element is visible, and disconnecting stops the observer and the listeners. Each send
// re-reads the payload.
let sharedObserver: FakeIntersectionObserver | undefined;
class FakeViewEventElement extends HTMLElement {
  #abort: AbortController | undefined;

  connectedCallback() {
    this.#abort = new AbortController();
    const send = () => setTimeout(() => this.dispatchViewEvent());
    const trigger = this.getAttribute("view-event-trigger");
    const dialog = !trigger || trigger === "dialog" ? this.closest("dialog") : null;
    const mode = dialog ? "dialog" : (trigger ?? "connect");
    if (mode === "connect") send();
    if (mode === "dialog") {
      if (dialog?.open) send();
      dialog?.addEventListener("toggle", () => dialog.open && this.dispatchViewEvent(), {
        signal: this.#abort.signal,
      });
    }
    if (mode === "intersect") {
      sharedObserver ??= new FakeIntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            sharedObserver?.unobserve(entry.target);
            (entry.target as FakeViewEventElement).dispatchViewEvent();
          }
        },
        { threshold: 0.5 },
      );
      sharedObserver.observe(this);
    }
  }

  disconnectedCallback() {
    sharedObserver?.unobserve(this);
    this.#abort?.abort();
  }

  dispatchViewEvent() {
    if (!this.isConnected) return;
    const detail: unknown = JSON.parse(this.getAttribute("view-event-payload") ?? "{}");
    this.dispatchEvent(new CustomEvent("shopify:test:view", { bubbles: true, detail }));
  }
}

describe("defineViewEventElement", () => {
  const createViewEventElement = vi.fn((): typeof FakeViewEventElement => FakeViewEventElement);
  let defineSpy: ReturnType<typeof vi.spyOn>;
  let events: CustomEvent[];
  const record = (event: Event) => events.push(event as CustomEvent);
  const ids = () => events.map((event) => (event.detail as { id: string }).id);

  async function loadDefineViewEventElement() {
    vi.resetModules();
    return (await import("./view-event-element")).defineViewEventElement;
  }

  function mockModule() {
    importStandardEventsFromCDN.mockResolvedValue({
      createViewEventElement,
    } as Partial<typeof StandardEventsModule>);
  }

  async function ensureDefined() {
    if (customElements.get(TAG)) return;
    mockModule();
    (await loadDefineViewEventElement())();
    await customElements.whenDefined(TAG);
  }

  // Sets the key, then the payload, of the item with the given ID.
  function setItem(element: Element, id: string, extra?: string) {
    element.setAttribute("view-event-key", id);
    element.setAttribute("view-event-payload", makePayload(id, extra));
  }

  function renderElement(
    trigger: string,
    id: string,
    parent: HTMLElement = document.body,
  ): HTMLElement & { dispatchViewEvent(): void } {
    const element = document.createElement(TAG) as HTMLElement & { dispatchViewEvent(): void };
    element.setAttribute("view-event-trigger", trigger);
    setItem(element, id);
    parent.append(element);
    return element;
  }

  beforeEach(() => {
    importStandardEventsFromCDN.mockReset();
    createViewEventElement.mockClear();
    defineSpy = vi.spyOn(customElements, "define");
    events = [];
    io.observed.clear();
    ro.observed.clear();
    ro.hidden.clear();
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    Object.defineProperty(HTMLElement.prototype, "checkVisibility", {
      configurable: true,
      value(this: HTMLElement) {
        return !ro.hidden.has(this);
      },
    });
    document.addEventListener("shopify:test:view", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:test:view", record);
    Reflect.deleteProperty(HTMLElement.prototype, "checkVisibility");
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Runs first: the registry keeps the element for the other tests.
  it("defines the element once and sends one event for an element that it upgrades", async () => {
    renderElement("connect", "a");
    mockModule();
    const defineViewEventElement = await loadDefineViewEventElement();

    defineViewEventElement();
    defineViewEventElement();
    await customElements.whenDefined(TAG);
    await nextTask();

    expect(importStandardEventsFromCDN).toHaveBeenCalledTimes(1);
    expect(defineSpy).toHaveBeenCalledTimes(1);
    expect(customElements.get(TAG)?.prototype).toBeInstanceOf(FakeViewEventElement);
    expect(ids()).toEqual(["a"]);

    // A second module instance skips an element that another copy already defined.
    const defineAgain = await loadDefineViewEventElement();
    defineAgain();
    await vi.waitFor(() => expect(importStandardEventsFromCDN).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(defineSpy).toHaveBeenCalledTimes(1);
  });

  it("sends once on connect, ignores same-key updates, and sends again when the key changes", async () => {
    await ensureDefined();
    const element = renderElement("connect", "a");
    await nextTask();
    expect(ids()).toEqual(["a"]);

    setItem(element, "a", "v2");
    await nextTask();
    expect(ids()).toEqual(["a"]);

    setItem(element, "b", "v1");
    await nextTask();
    expect(ids()).toEqual(["a", "b"]);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toEqual({ id: "b", extra: "v1" });
  });

  it("sends the latest key once when the key changes twice before the next send", async () => {
    await ensureDefined();
    const element = renderElement("connect", "a");
    await nextTask();

    setItem(element, "b");
    setItem(element, "c");
    await nextTask();

    expect(ids()).toEqual(["a", "c"]);
  });

  it("sends the new payload once when the payload changes before the key", async () => {
    await ensureDefined();
    const element = renderElement("connect", "a");
    await nextTask();

    element.setAttribute("view-event-payload", makePayload("b", "new"));
    element.setAttribute("view-event-key", "b");
    await nextTask();

    expect(events).toHaveLength(2);
    expect(events[1]?.detail).toEqual({ id: "b", extra: "new" });
  });

  it("sends once on connect without a key and doesn't send again when the payload changes", async () => {
    await ensureDefined();
    const element = document.createElement(TAG);
    element.setAttribute("view-event-trigger", "connect");
    element.setAttribute("view-event-payload", makePayload("a"));
    document.body.append(element);
    await nextTask();
    expect(ids()).toEqual(["a"]);

    element.setAttribute("view-event-payload", makePayload("b"));
    element.setAttribute("view-event-key", "");
    await nextTask();
    expect(ids()).toEqual(["a"]);
  });

  it("lets the base element send the latest payload when the key changes before the first view", async () => {
    await ensureDefined();
    const element = renderElement("intersect", "a");

    setItem(element, "b");
    io.show(element);

    expect(ids()).toEqual(["b"]);
  });

  it("ignores an empty or removed key after the first view and resumes sending when it is re-added", async () => {
    await ensureDefined();
    const element = renderElement("connect", "a");
    await nextTask();

    element.setAttribute("view-event-key", "");
    element.removeAttribute("view-event-key");
    element.setAttribute("view-event-payload", makePayload("b"));
    await nextTask();
    expect(ids()).toEqual(["a"]);

    setItem(element, "a");
    await nextTask();
    expect(ids()).toEqual(["a"]);
    setItem(element, "b");
    await nextTask();
    expect(ids()).toEqual(["a", "b"]);
  });

  it("waits until a card is visible again before sending a new key", async () => {
    await ensureDefined();
    const element = renderElement("intersect", "a");
    io.show(element);
    expect(ids()).toEqual(["a"]);
    expect(io.observed.has(element)).toBe(false);

    // The same key doesn't restart the base element, so the card isn't watched again.
    setItem(element, "a", "variant");
    expect(io.observed.has(element)).toBe(false);

    setItem(element, "b");
    await nextTask();
    expect(ids()).toEqual(["a"]);
    expect(io.options).toEqual({ threshold: 0.5 });
    expect(io.observed.has(element)).toBe(true);

    io.show(element);
    expect(ids()).toEqual(["a", "b"]);
    expect(io.observed.has(element)).toBe(false);
  });

  it("sends only the latest key for an off-screen card and nothing when it returns to the sent key", async () => {
    await ensureDefined();
    const element = renderElement("intersect", "a");
    io.show(element);

    // Away and back before it is seen again: the pending send finds the key already sent.
    setItem(element, "b");
    setItem(element, "a");
    io.show(element);
    expect(ids()).toEqual(["a"]);

    // Twice before it is seen again: only the final key is sent.
    setItem(element, "b");
    setItem(element, "c");
    io.show(element);
    expect(ids()).toEqual(["a", "c"]);

    // Removing a card that waits to be seen stops the wait.
    setItem(element, "d");
    expect(io.observed.has(element)).toBe(true);
    element.remove();
    expect(io.observed.has(element)).toBe(false);
  });

  // Next.js `cacheComponents` keeps the page you leave in a hidden <Activity>: the element stays
  // connected, or reconnects, under a `display: none` ancestor.
  it("doesn't send from a hidden connect element and sends once it is shown", async () => {
    await ensureDefined();
    const element = document.createElement(TAG);
    ro.hidden.add(element);
    element.setAttribute("view-event-trigger", "connect");
    setItem(element, "a");
    document.body.append(element);
    await nextTask();
    expect(ids()).toEqual([]);

    // A key change while hidden waits too, and the showing sends the latest payload.
    setItem(element, "b");
    await nextTask();
    expect(ids()).toEqual([]);

    ro.show(element);
    expect(ids()).toEqual(["b"]);
    expect(events[0]?.target).toBe(element);

    // A resize while shown is not a new view.
    ro.notify(element);
    await nextTask();
    expect(ids()).toEqual(["b"]);
  });

  it("sends again when a connected element is shown after it was hidden", async () => {
    await ensureDefined();
    const element = renderElement("connect", "a");
    await nextTask();
    expect(ids()).toEqual(["a"]);

    ro.hide(element);
    await nextTask();
    expect(ids()).toEqual(["a"]);

    ro.show(element);
    expect(ids()).toEqual(["a", "a"]);

    // Removing the element stops watching it.
    element.remove();
    expect(ro.observed.has(element)).toBe(false);
  });

  it("watches only connect elements for visibility", async () => {
    await ensureDefined();
    const dialog = document.createElement("dialog");
    document.body.append(dialog);
    renderElement("intersect", "a");
    renderElement("dialog", "b", dialog);
    renderElement("manual", "c");
    const page = renderElement("connect", "d");

    expect([...ro.observed]).toEqual([page]);
  });

  it("sends once per opening in a dialog, including reopen with a key swap in the same task", async () => {
    await ensureDefined();
    const dialog = document.createElement("dialog");
    document.body.append(dialog);
    const element = renderElement("dialog", "a", dialog);

    openDialog(dialog);
    await nextTask();
    expect(ids()).toEqual(["a"]);

    closeDialog(dialog);
    await nextTask();

    // Swapping while closed sends nothing until the dialog opens.
    setItem(element, "c");
    await nextTask();
    expect(ids()).toEqual(["a"]);

    // Reopen and swap to B in the same task: B is sent once, not again for the queued `toggle`.
    openDialog(dialog);
    setItem(element, "b");
    await nextTask();
    await nextTask();
    expect(ids()).toEqual(["a", "b"]);

    // Swapping while open sends C once.
    setItem(element, "c");
    await nextTask();
    expect(ids()).toEqual(["a", "b", "c"]);

    // Close and reopen with the same key: a new opening sends C again.
    closeDialog(dialog);
    await nextTask();
    openDialog(dialog);
    await nextTask();
    expect(ids()).toEqual(["a", "b", "c", "c"]);
  });

  it("sends once when mounted inside a dialog in the same task that opened it", async () => {
    await ensureDefined();
    const dialog = document.createElement("dialog");
    document.body.append(dialog);

    openDialog(dialog);
    renderElement("dialog", "a", dialog);
    await nextTask();
    await nextTask();

    expect(ids()).toEqual(["a"]);
  });

  it("observes the payload and the key in addition to the attributes of the base element", async () => {
    const define = vi.fn();
    vi.stubGlobal("customElements", { get: () => undefined, define });
    class Base extends FakeViewEventElement {
      static observedAttributes = ["other"];
    }
    importStandardEventsFromCDN.mockResolvedValue({
      createViewEventElement: () => Base,
    } as Partial<typeof StandardEventsModule>);

    (await loadDefineViewEventElement())();
    await vi.waitFor(() => expect(define).toHaveBeenCalledTimes(1));

    const element = define.mock.calls[0]?.[1] as { observedAttributes: string[] };
    expect(element.observedAttributes).toEqual(["other", "view-event-payload", "view-event-key"]);
  });

  it("does nothing on the server", async () => {
    vi.stubGlobal("customElements", undefined);
    const defineViewEventElement = await loadDefineViewEventElement();

    defineViewEventElement();

    expect(importStandardEventsFromCDN).not.toHaveBeenCalled();
  });

  it("ignores both a failed module load and an error during registration", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    importStandardEventsFromCDN.mockRejectedValueOnce(new Error("offline"));
    (await loadDefineViewEventElement())();
    await nextTask();

    importStandardEventsFromCDN.mockResolvedValueOnce({
      createViewEventElement: () => {
        throw new Error("bad CDN factory");
      },
    } as Partial<typeof StandardEventsModule>);
    (await loadDefineViewEventElement())();
    await nextTask();

    process.off("unhandledRejection", unhandled);

    expect(importStandardEventsFromCDN).toHaveBeenCalledTimes(2);
    expect(defineSpy).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });
});
