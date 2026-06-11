// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

type TimingEntry = {
  name: string;
  description: string;
};

function createEntry(serverTiming: TimingEntry[], name = window.location.href) {
  return {
    initiatorType: "fetch",
    name,
    serverTiming,
  } as unknown as PerformanceResourceTiming;
}

async function getTrackingValues() {
  vi.resetModules();
  return (await import("./tracking-values")).getTrackingValues;
}

describe("getTrackingValues", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    Object.defineProperty(document, "cookie", {
      configurable: true,
      value: "",
      writable: true,
    });
  });

  it("reads _y and _s from navigation Server-Timing without requiring _cmp", async () => {
    vi.spyOn(performance, "getEntriesByType").mockImplementation((type) => {
      if (type === "resource") return [];
      if (type === "navigation") {
        return [
          createEntry([
            { name: "_y", description: "unique-token" },
            { name: "_s", description: "visit-token" },
          ]),
        ];
      }

      return [];
    });

    expect((await getTrackingValues())()).toEqual({
      uniqueToken: "unique-token",
      visitToken: "visit-token",
      consent: "",
    });
  });

  it("still requires _cmp when reading matching resource Server-Timing", async () => {
    vi.spyOn(performance, "getEntriesByType").mockImplementation((type) => {
      if (type === "resource") {
        return [
          createEntry([
            { name: "_y", description: "unique-token" },
            { name: "_s", description: "visit-token" },
          ]),
        ];
      }

      if (type === "navigation") return [];

      return [];
    });

    expect((await getTrackingValues())()).toEqual({
      uniqueToken: "",
      visitToken: "",
      consent: "",
    });
  });

  it("reads _y, _s, and _cmp from matching resource Server-Timing", async () => {
    vi.spyOn(performance, "getEntriesByType").mockImplementation((type) => {
      if (type === "resource") {
        return [
          createEntry([
            { name: "_y", description: "unique-token" },
            { name: "_s", description: "visit-token" },
            { name: "_cmp", description: "consent-token" },
          ]),
        ];
      }

      return [];
    });

    expect((await getTrackingValues())()).toEqual({
      uniqueToken: "unique-token",
      visitToken: "visit-token",
      consent: "consent-token",
    });
  });
});
