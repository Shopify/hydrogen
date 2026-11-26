// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../vendor/standard-events";
import { VIEW_EVENT_TAG_NAME as TAG } from "./view-event-element";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("./standard-events", () => ({ importStandardEventsFromCDN }));

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

// Mirrors the CDN createViewEventElement for the `connect` and `manual` triggers: `connect` sends
// one task after each connect, and `manual` sends only on `dispatchViewEvent()`.
class FakeViewEventElement extends HTMLElement {
  connectedCallback() {
    if (this.getAttribute("view-event-trigger") !== "manual") {
      setTimeout(() => this.dispatchViewEvent());
    }
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

  function renderElement(trigger: string, id: string) {
    const element = document.createElement(TAG) as HTMLElement & { dispatchViewEvent(): void };
    element.setAttribute("view-event-trigger", trigger);
    element.setAttribute("view-event-payload", JSON.stringify({ id }));
    document.body.append(element);
    return element;
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
  it("registers Shopify's element once and upgrades an element that is already rendered", async () => {
    renderElement("connect", "a");
    mockModule();
    const defineViewEventElement = await loadDefineViewEventElement();

    defineViewEventElement();
    defineViewEventElement();
    await customElements.whenDefined(TAG);
    await nextTask();

    expect(importStandardEventsFromCDN).toHaveBeenCalledTimes(1);
    expect(defineSpy).toHaveBeenCalledTimes(1);
    expect(defineSpy).toHaveBeenCalledWith(TAG, FakeViewEventElement);
    expect(ids()).toEqual(["a"]);

    // A second module instance skips an element that another copy already defined.
    const defineAgain = await loadDefineViewEventElement();
    defineAgain();
    await vi.waitFor(() => expect(importStandardEventsFromCDN).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(defineSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps the base behavior: connect sends once per connect, and manual sends only on request", async () => {
    await ensureDefined();
    const connect = renderElement("connect", "a");
    const manual = renderElement("manual", "b");
    await nextTask();
    expect(ids()).toEqual(["a"]);

    connect.setAttribute("view-event-payload", JSON.stringify({ id: "a2" }));
    await nextTask();
    expect(ids()).toEqual(["a"]);

    connect.remove();
    document.body.append(connect);
    await nextTask();
    expect(ids()).toEqual(["a", "a2"]);

    manual.dispatchViewEvent();
    expect(ids()).toEqual(["a", "a2", "b"]);
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
    // An empty registry, so the factory runs even though an earlier test defined the element.
    const define = vi.fn();
    vi.stubGlobal("customElements", { get: () => undefined, define });

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
    expect(define).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });
});
