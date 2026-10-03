import { getEventListeners } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

import { stubAbortSignalWithoutAny } from "../test-utils";
import { combineAbortSignals } from "./abort-signal";

describe("combineAbortSignals", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe.each([
    ["with native AbortSignal.any", false],
    ["without AbortSignal.any", true],
  ])("%s", (_label, withoutNative) => {
    function combine(signals: AbortSignal[]) {
      if (withoutNative) stubAbortSignalWithoutAny();
      return combineAbortSignals(signals);
    }

    it("aborts when any source aborts", () => {
      const first = new AbortController();
      const second = new AbortController();
      const { signal } = combine([first.signal, second.signal]);

      expect(signal.aborted).toBe(false);
      second.abort("second");

      expect(signal.aborted).toBe(true);
    });

    it("is aborted immediately when a source is already aborted", () => {
      const aborted = new AbortController();
      aborted.abort("gone");
      const { signal } = combine([new AbortController().signal, aborted.signal]);

      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBe("gone");
    });
  });

  describe("without AbortSignal.any", () => {
    // Native reason ordering varies across Node versions, so only the fallback pins it.
    it("aborts with the reason of the first source that aborts", () => {
      stubAbortSignalWithoutAny();
      const first = new AbortController();
      const second = new AbortController();
      const { signal } = combineAbortSignals([first.signal, second.signal]);

      second.abort("second");
      first.abort("first");

      expect(signal.reason).toBe("second");
    });

    it("removes its listeners from every source when one aborts", () => {
      stubAbortSignalWithoutAny();
      const longLived = new AbortController();
      const shortLived = new AbortController();

      combineAbortSignals([longLived.signal, shortLived.signal]);
      shortLived.abort();

      expect(getEventListeners(longLived.signal, "abort")).toHaveLength(0);
    });

    it("removes its listeners from every source on dispose", () => {
      stubAbortSignalWithoutAny();
      const first = new AbortController();
      const second = new AbortController();

      combineAbortSignals([first.signal, second.signal]).dispose();

      expect(getEventListeners(first.signal, "abort")).toHaveLength(0);
      expect(getEventListeners(second.signal, "abort")).toHaveLength(0);
    });
  });
});
