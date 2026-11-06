import { afterEach, describe, expect, it, vi } from "vitest";

import { waitForPageReady } from "./page-ready.ts";

afterEach(() => vi.useRealTimers());

describe("page readiness deadline", () => {
  it.each(["page acquisition", "evaluation"])("bounds a hung %s call", async (hung) => {
    vi.useFakeTimers();
    let release: (() => void) | undefined;
    const pendingCall = new Promise<void>((resolve) => {
      release = resolve;
    });
    const evaluate = vi.fn(async () => {
      if (hung === "evaluation") await pendingCall;
      return false;
    });
    const page = { evaluate };
    const acquisition = (async () => {
      if (hung === "page acquisition") await pendingCall;
      return page;
    })();
    const result = waitForPageReady(acquisition, { timeoutMs: 300 }).catch(
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(300);

    expect(((await result) as Error).message).toBe("Page did not become observable within 300 ms.");
    const polls = evaluate.mock.calls.length;
    release?.();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(evaluate).toHaveBeenCalledTimes(polls);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ends a hung evaluation on abort and does not poll after it returns late", async () => {
    vi.useFakeTimers();
    let release: ((value: boolean) => void) | undefined;
    const evaluate = vi.fn(
      async () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    const controller = new AbortController();
    const reason = new Error("stop");
    const result = waitForPageReady({ evaluate }, { signal: controller.signal }).catch(
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(evaluate).toHaveBeenCalledTimes(1);

    controller.abort(reason);

    expect(await result).toBe(reason);
    release?.(false);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries an evaluation after its context is replaced", async () => {
    vi.useFakeTimers();
    const evaluate = vi.fn(async () => true).mockRejectedValueOnce(new Error("context replaced"));
    const pending = waitForPageReady({ evaluate }, { timeoutMs: 300 });

    await vi.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBeUndefined();
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("counts page acquisition and polling against the same deadline", async () => {
    vi.useFakeTimers();
    const page = { evaluate: vi.fn(async () => false) };
    const acquisition = new Promise<typeof page>((resolve) => setTimeout(() => resolve(page), 200));
    let outcome: unknown;
    const pending = waitForPageReady(acquisition, { timeoutMs: 300 }).catch((error: unknown) => {
      outcome = error;
    });

    await vi.advanceTimersByTimeAsync(299);
    expect(outcome).toBeUndefined();
    expect(page.evaluate).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await pending;

    expect((outcome as Error).message).toBe("Page did not become observable within 300 ms.");
    expect(vi.getTimerCount()).toBe(0);
  });
});
