// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../vendor/standard-events";
import { assert } from "../test-utils";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("./standard-events", () => ({ importStandardEventsFromCDN }));

const TAG = "test-view-event";
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

describe("defineViewEventElement", () => {
  // Mirrors the CDN element: `connect` sends after connecting, `dialog` sends on open and on
  // `toggle` while open, and each send re-reads the payload.
  class FakeViewEventElement extends HTMLElement {
    #abort: AbortController | undefined;

    connectedCallback() {
      this.#abort?.abort();
      this.#abort = new AbortController();
      const trigger = this.getAttribute("view-event-trigger");
      const dialog = !trigger || trigger === "dialog" ? this.closest("dialog") : null;
      if (trigger === "dialog" || dialog) {
        if (dialog?.open) setTimeout(() => this.dispatchViewEvent());
        dialog?.addEventListener("toggle", () => dialog.open && this.dispatchViewEvent(), {
          signal: this.#abort.signal,
        });
        return;
      }
      if (trigger === "connect") {
        setTimeout(() => this.dispatchViewEvent());
      }
    }

    disconnectedCallback() {
      this.#abort?.abort();
    }

    dispatchViewEvent() {
      if (!this.isConnected) return;
      const detail: unknown = JSON.parse(this.getAttribute("view-event-payload") ?? "{}");
      this.dispatchEvent(new CustomEvent("shopify:test:view", { bubbles: true, detail }));
    }
  }

  const createViewEventElement = vi.fn((): typeof FakeViewEventElement => FakeViewEventElement);
  let defineSpy: ReturnType<typeof vi.spyOn>;
  let events: CustomEvent[];
  const record = (event: Event) => events.push(event as CustomEvent);

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
    (await loadDefineViewEventElement())<{ id?: string }>(TAG, (p) => p.id);
    await customElements.whenDefined(TAG);
  }

  function renderElement(
    trigger: string,
    payload: string,
    parent: HTMLElement = document.body,
  ): HTMLElement & { dispatchViewEvent(): void } {
    const element = document.createElement(TAG) as HTMLElement & { dispatchViewEvent(): void };
    element.setAttribute("view-event-trigger", trigger);
    element.setAttribute("view-event-payload", payload);
    parent.append(element);
    return element;
  }

  function stubIntersectionObserver() {
    let callback: IntersectionObserverCallback | undefined;
    let options: IntersectionObserverInit | undefined;
    const observed = new Set<Element>();
    const disconnect = vi.fn(() => observed.clear());

    class FakeIntersectionObserver {
      constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
        callback = cb;
        options = opts;
      }
      observe(target: Element) {
        observed.add(target);
      }
      unobserve(target: Element) {
        observed.delete(target);
      }
      disconnect = disconnect;
    }

    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

    return {
      observed,
      disconnect,
      getOptions: () => options,
      trigger(
        target: Element,
        isIntersecting: boolean,
        intersectionRatio = isIntersecting ? 1 : 0,
      ) {
        assert(callback, "expected an IntersectionObserver to be created");
        callback(
          [{ target, isIntersecting, intersectionRatio } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      },
    };
  }

  beforeEach(() => {
    importStandardEventsFromCDN.mockReset();
    createViewEventElement.mockClear();
    defineSpy = vi.spyOn(customElements, "define");
    events = [];
    document.addEventListener("shopify:test:view", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:test:view", record);
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Runs first: the registry keeps the element for the other tests.
  it("defines the element once and sends one event for an element that it upgrades", async () => {
    renderElement("connect", makePayload("a"));
    mockModule();
    const defineViewEventElement = await loadDefineViewEventElement();

    defineViewEventElement<{ id?: string }>(TAG, (p) => p.id);
    defineViewEventElement<{ id?: string }>(TAG, (p) => p.id);
    await customElements.whenDefined(TAG);
    await nextTask();

    expect(importStandardEventsFromCDN).toHaveBeenCalledTimes(1);
    expect(defineSpy).toHaveBeenCalledTimes(1);
    expect(customElements.get(TAG)?.prototype).toBeInstanceOf(FakeViewEventElement);
    expect(events).toHaveLength(1);
    // happy-dom upgrades a disconnected copy of the node, so read the element from the document.
    const upgraded = document.querySelector(TAG);
    expect(events[0]?.target).toBe(upgraded);

    // Browsers upgrade the connected node and report its attributes with a null old value.
    (
      upgraded as HTMLElement & { attributeChangedCallback(...args: unknown[]): void }
    ).attributeChangedCallback("view-event-payload", null, makePayload("a"));
    expect(events).toHaveLength(1);

    // A second module instance skips an element that another copy already defined.
    const defineAgain = await loadDefineViewEventElement();
    defineAgain<{ id?: string }>(TAG, (p) => p.id);
    await vi.waitFor(() => expect(importStandardEventsFromCDN).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(defineSpy).toHaveBeenCalledTimes(1);
  });

  it("sends once on connect, ignores same-key updates, and sends again when the key changes", async () => {
    await ensureDefined();
    const element = renderElement("connect", makePayload("a", "v1"));
    await nextTask();
    expect(events).toHaveLength(1);

    element.setAttribute("view-event-payload", makePayload("a", "v2"));
    expect(events).toHaveLength(1);

    element.setAttribute("view-event-payload", makePayload("b", "v1"));
    expect(events).toHaveLength(2);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toEqual({ id: "b", extra: "v1" });
  });

  it("ignores bad payloads after the first view and resumes sending when the attribute is re-added", async () => {
    await ensureDefined();
    const element = renderElement("connect", makePayload("a"));
    await nextTask();
    expect(events).toHaveLength(1);

    // First view has already fired, so attributeChangedCallback reaches keyOf's parser.
    expect(() => element.setAttribute("view-event-payload", "{")).not.toThrow();
    element.setAttribute("view-event-payload", "{}");
    element.setAttribute("view-event-payload", "null");
    element.removeAttribute("view-event-payload");
    expect(events).toHaveLength(1);

    // Re-adding the attribute with a new key sends again; re-adding the same key would not.
    element.setAttribute("view-event-payload", makePayload("a"));
    expect(events).toHaveLength(1);
    element.setAttribute("view-event-payload", makePayload("b"));
    expect(events).toHaveLength(2);
    expect(events[1]?.detail).toEqual({ id: "b" });
  });

  it("doesn't send the event from a disconnected element", async () => {
    await ensureDefined();
    const dispatch = vi.spyOn(FakeViewEventElement.prototype, "dispatchViewEvent");
    const element = document.createElement(TAG);
    element.setAttribute("view-event-trigger", "connect");
    element.setAttribute("view-event-payload", makePayload("a"));
    element.setAttribute("view-event-payload", makePayload("b"));

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("waits for 50% visibility when an intersect element swaps key after its first view", async () => {
    await ensureDefined();
    const io = stubIntersectionObserver();
    const element = renderElement("intersect", makePayload("a"));

    // Before the first view, the base observer still owns sending the latest payload.
    element.setAttribute("view-event-payload", makePayload("b"));
    expect(events).toHaveLength(0);
    expect(io.observed.size).toBe(0);

    element.dispatchViewEvent();
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ id: "b" });

    // A later key change waits until at least 50% of the element is visible.
    element.setAttribute("view-event-payload", makePayload("c"));
    expect(events).toHaveLength(1);
    expect(io.getOptions()).toEqual({ threshold: 0.5 });
    expect(io.observed.has(element)).toBe(true);

    io.trigger(element, false, 0);
    // Partial overlap below 50% must not fire even when isIntersecting is true.
    io.trigger(element, true, 0.1);
    expect(events).toHaveLength(1);
    expect(io.observed.has(element)).toBe(true);

    io.trigger(element, true, 0.5);
    expect(events).toHaveLength(2);
    expect(events[1]?.detail).toEqual({ id: "c" });
    expect(io.observed.size).toBe(0);
    expect(io.disconnect).toHaveBeenCalledTimes(1);
  });

  it("sends only the latest key when an off-screen card swaps twice, and cancels on return or disconnect", async () => {
    await ensureDefined();
    const io = stubIntersectionObserver();
    const element = renderElement("intersect", makePayload("a"));
    element.dispatchViewEvent();
    expect(events).toHaveLength(1);

    // Swapping away and back while off screen cancels observation.
    element.setAttribute("view-event-payload", makePayload("b"));
    expect(io.observed.has(element)).toBe(true);
    element.setAttribute("view-event-payload", makePayload("a"));
    expect(io.observed.has(element)).toBe(false);
    expect(events).toHaveLength(1);

    // Swapping twice while off screen sends only the final key when visible.
    element.setAttribute("view-event-payload", makePayload("b"));
    element.setAttribute("view-event-payload", makePayload("c"));
    io.trigger(element, true, 0.75);
    expect(events).toHaveLength(2);
    expect(events[1]?.detail).toEqual({ id: "c" });

    // Disconnecting while waiting cancels observation.
    element.setAttribute("view-event-payload", makePayload("a"));
    expect(io.observed.has(element)).toBe(true);
    element.remove();
    expect(io.observed.size).toBe(0);
    expect(events).toHaveLength(2);
  });

  it("sends once per opening in a dialog, including reopen with a key swap in the same task", async () => {
    await ensureDefined();
    const dialog = document.createElement("dialog");
    document.body.append(dialog);
    const element = renderElement("dialog", makePayload("a"), dialog);

    openDialog(dialog);
    await nextTask();
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ id: "a" });

    closeDialog(dialog);
    await nextTask();

    // Swapping while closed sends nothing.
    element.setAttribute("view-event-payload", makePayload("c"));
    await nextTask();
    expect(events).toHaveLength(1);

    // Reopen and swap to B in the same task: sends B once, not twice when `toggle` fires.
    openDialog(dialog);
    element.setAttribute("view-event-payload", makePayload("b"));
    await nextTask();
    expect(events).toHaveLength(2);
    expect(events[1]?.detail).toEqual({ id: "b" });

    // Swapping while already open sends C once.
    element.setAttribute("view-event-payload", makePayload("c"));
    await nextTask();
    expect(events).toHaveLength(3);
    expect(events[2]?.detail).toEqual({ id: "c" });

    // Close and reopen with the same key C: sends C again on the new opening.
    closeDialog(dialog);
    await nextTask();
    openDialog(dialog);
    await nextTask();
    expect(events).toHaveLength(4);
    expect(events[3]?.detail).toEqual({ id: "c" });
  });

  it("sends once when mounted inside a dialog in the same task that opened it", async () => {
    await ensureDefined();
    const dialog = document.createElement("dialog");
    document.body.append(dialog);

    openDialog(dialog);
    renderElement("dialog", makePayload("a"), dialog);
    await nextTask();

    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ id: "a" });
  });

  it("observes the payload in addition to the attributes of the base element", async () => {
    const define = vi.fn();
    vi.stubGlobal("customElements", { get: () => undefined, define });
    class Base extends FakeViewEventElement {
      static observedAttributes = ["other"];
    }
    importStandardEventsFromCDN.mockResolvedValue({
      createViewEventElement: () => Base,
    } as Partial<typeof StandardEventsModule>);

    (await loadDefineViewEventElement())<{ id?: string }>(TAG, (p) => p.id);
    await vi.waitFor(() => expect(define).toHaveBeenCalledTimes(1));

    const element = define.mock.calls[0]?.[1] as { observedAttributes: string[] };
    expect(element.observedAttributes).toEqual(["other", "view-event-payload"]);
  });

  it("does nothing on the server", async () => {
    vi.stubGlobal("customElements", undefined);
    const defineViewEventElement = await loadDefineViewEventElement();

    defineViewEventElement<{ id?: string }>(TAG, (p) => p.id);

    expect(importStandardEventsFromCDN).not.toHaveBeenCalled();
  });

  it("ignores both a failed module load and an error during registration", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    importStandardEventsFromCDN.mockRejectedValueOnce(new Error("offline"));
    (await loadDefineViewEventElement())<{ id?: string }>(TAG, (p) => p.id);
    await nextTask();

    importStandardEventsFromCDN.mockResolvedValueOnce({
      createViewEventElement: () => {
        throw new Error("bad CDN factory");
      },
    } as Partial<typeof StandardEventsModule>);
    (await loadDefineViewEventElement())<{ id?: string }>(TAG, (p) => p.id);
    await nextTask();

    process.off("unhandledRejection", unhandled);

    expect(importStandardEventsFromCDN).toHaveBeenCalledTimes(2);
    expect(defineSpy).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });
});
