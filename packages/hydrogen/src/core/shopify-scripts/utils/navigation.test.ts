// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { observeNavigation } from "./navigation";

function subscribe(callback: () => void) {
  const cleanup = observeNavigation(callback);
  onTestFinished(cleanup);
  return cleanup;
}

describe("observeNavigation", () => {
  beforeEach(() => {
    delete (window as any).navigation;
  });

  it("observes Navigation API entry changes when supported", () => {
    const callback = vi.fn();
    const navigation = new EventTarget();
    Object.defineProperty(window, "navigation", { configurable: true, value: navigation });

    const cleanup = subscribe(callback);
    navigation.dispatchEvent(new Event("currententrychange"));

    expect(callback).toHaveBeenCalledOnce();

    cleanup();
    navigation.dispatchEvent(new Event("currententrychange"));
    expect(callback).toHaveBeenCalledOnce();
  });

  it("falls back to history methods and popstate", () => {
    const callback = vi.fn();
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const cleanup = subscribe(callback);
    window.history.pushState({}, "", "/next");
    window.history.replaceState({}, "", "/replaced");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(callback).toHaveBeenCalledTimes(3);

    cleanup();
    expect(window.history.pushState).toBe(originalPushState);
    expect(window.history.replaceState).toBe(originalReplaceState);

    window.history.pushState({}, "", "/ignored");
    window.history.replaceState({}, "", "/also-ignored");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("shares one history patch across independently cleaned up subscribers", () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const originalPushState = window.history.pushState;
    const stopFirst = subscribe(firstCallback);
    const patchedPushState = window.history.pushState;
    const stopSecond = subscribe(secondCallback);

    expect(window.history.pushState).toBe(patchedPushState);
    window.history.pushState({}, "", "/both");
    expect(firstCallback).toHaveBeenCalledOnce();
    expect(secondCallback).toHaveBeenCalledOnce();

    stopFirst();
    window.history.pushState({}, "", "/second-only");
    expect(firstCallback).toHaveBeenCalledOnce();
    expect(secondCallback).toHaveBeenCalledTimes(2);
    expect(window.history.pushState).toBe(patchedPushState);

    stopSecond();
    expect(window.history.pushState).toBe(originalPushState);
  });
});
