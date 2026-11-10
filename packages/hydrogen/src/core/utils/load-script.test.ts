// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";

import { loadScript } from "./load-script";

describe("loadScript", () => {
  let appendChildSpy: MockInstance<typeof document.body.appendChild>;

  beforeEach(() => {
    appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.head, "appendChild").mockImplementation((node) => node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear the module-level cache between tests
    vi.resetModules();
  });

  it("sets attributes before inserting the script into the DOM", async () => {
    let capturedAttributes: Record<string, string | null> = {};

    appendChildSpy.mockImplementation((node) => {
      const el = node as HTMLScriptElement;
      capturedAttributes = {
        integrity: el.getAttribute("integrity"),
        crossorigin: el.getAttribute("crossorigin"),
      };
      return node;
    });

    loadScript("https://example.com/test.js", {
      attributes: {
        integrity: "sha384-abc123",
        crossorigin: "anonymous",
      },
    });

    expect(capturedAttributes.integrity).toBe("sha384-abc123");
    expect(capturedAttributes.crossorigin).toBe("anonymous");
  });
});
