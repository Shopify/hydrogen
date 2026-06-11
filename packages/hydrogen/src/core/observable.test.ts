import { describe, it, expect, vi } from "vitest";

import { createObservable } from "./observable";

const arraysEqual = (a: number[], b: number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

describe("createObservable", () => {
  it("returns the initial state", () => {
    const obs = createObservable({ count: 0 });
    expect(obs.state).toEqual({ count: 0 });
  });

  it("updates state via setState with a value", () => {
    const obs = createObservable({ count: 0 });
    obs.setState({ count: 1 });
    expect(obs.state).toEqual({ count: 1 });
  });

  it("updates state via setState with a function", () => {
    const obs = createObservable({ count: 0 });
    obs.setState((prev) => ({ count: prev.count + 1 }));
    expect(obs.state).toEqual({ count: 1 });
  });

  describe("subscribe", () => {
    it("notifies subscribers synchronously on setState", () => {
      const obs = createObservable({ count: 0 });
      const listener = vi.fn();
      obs.subscribe(listener);

      obs.setState({ count: 1 });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ count: 1 });
    });

    it("does not notify after unsubscribe", () => {
      const obs = createObservable({ count: 0 });
      const listener = vi.fn();
      const unsub = obs.subscribe(listener);

      unsub();
      obs.setState({ count: 1 });

      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple subscribers", () => {
      const obs = createObservable({ count: 0 });
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      obs.subscribe(listener1);
      obs.subscribe(listener2);

      obs.setState({ count: 1 });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("unsubscribing one does not affect another", () => {
      const obs = createObservable({ count: 0 });
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const unsub1 = obs.subscribe(listener1);
      obs.subscribe(listener2);

      unsub1();
      obs.setState({ count: 1 });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("referential stability", () => {
    it("does not notify when setState produces the same reference", () => {
      const state = { count: 0 };
      const obs = createObservable(state);
      const listener = vi.fn();
      obs.subscribe(listener);

      obs.setState(state);

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not notify when updater function returns the same reference", () => {
      const state = { count: 0 };
      const obs = createObservable(state);
      const listener = vi.fn();
      obs.subscribe(listener);

      obs.setState((prev) => prev);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("selector-based subscribe", () => {
    it("only receives the selected slice", () => {
      const obs = createObservable({ count: 0, name: "test" });
      const listener = vi.fn();
      obs.subscribe(listener, (s) => s.count);

      obs.setState({ count: 1, name: "test" });

      expect(listener).toHaveBeenCalledWith(1);
    });

    it("does not fire when the selected slice is unchanged", () => {
      const obs = createObservable({ count: 0, name: "test" });
      const listener = vi.fn();
      obs.subscribe(listener, (s) => s.count);

      obs.setState({ count: 0, name: "updated" });

      expect(listener).not.toHaveBeenCalled();
    });

    it("uses custom isEqual when provided", () => {
      const obs = createObservable({ items: [1, 2, 3] });
      const listener = vi.fn();

      obs.subscribe(listener, (s) => s.items, arraysEqual);

      obs.setState({ items: [1, 2, 3] });
      expect(listener).not.toHaveBeenCalled();

      obs.setState({ items: [1, 2, 4] });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith([1, 2, 4]);
    });

    it("defaults to Object.is for equality", () => {
      const obs = createObservable({ nested: { value: 1 } });
      const listener = vi.fn();
      obs.subscribe(listener, (s) => s.nested);

      obs.setState({ nested: { value: 1 } });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("handles subscribing during notification", () => {
      const obs = createObservable({ count: 0 });
      const lateListener = vi.fn();

      obs.subscribe(() => {
        obs.subscribe(lateListener);
      });

      obs.setState({ count: 1 });
      expect(lateListener).not.toHaveBeenCalled();

      obs.setState({ count: 2 });
      expect(lateListener).toHaveBeenCalledTimes(1);
      expect(lateListener).toHaveBeenCalledWith({ count: 2 });
    });

    it("handles unsubscribing during notification", () => {
      const obs = createObservable({ count: 0 });
      const listener2 = vi.fn();
      let unsub2: () => void;

      obs.subscribe(() => {
        unsub2();
      });
      unsub2 = obs.subscribe(listener2);

      obs.setState({ count: 1 });
      expect(listener2).not.toHaveBeenCalled();
    });

    it("double unsubscribe is safe", () => {
      const obs = createObservable({ count: 0 });
      const unsub = obs.subscribe(vi.fn());

      unsub();
      expect(() => unsub()).not.toThrow();
    });
  });
});
