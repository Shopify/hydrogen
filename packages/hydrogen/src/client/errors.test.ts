import { describe, it, expect } from "vitest";

import { StorefrontApiError, StorefrontTimeoutError } from "./errors";

describe("StorefrontApiError", () => {
  it("sets name, message, requestId, status, and cause", () => {
    const cause = new Error("network fail");
    const error = new StorefrontApiError("SFAPI request failed", {
      requestId: "req-123",
      status: 500,
      cause,
    });

    expect(error.name).toBe("StorefrontApiError");
    expect(error.message).toBe("SFAPI request failed");
    expect(error.requestId).toBe("req-123");
    expect(error.status).toBe(500);
    expect(error.cause).toBe(cause);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(StorefrontApiError);
  });

  it("works without optional fields", () => {
    const error = new StorefrontApiError("basic error");

    expect(error.requestId).toBeUndefined();
    expect(error.status).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it("stores locations from GraphQL errors", () => {
    const locations = [{ line: 3, column: 5 }];
    const error = new StorefrontApiError("field error", { locations });

    expect(error.locations).toEqual([{ line: 3, column: 5 }]);
  });

  it("stores path from GraphQL errors", () => {
    const path = ["shop", "products", 0, "title"];
    const error = new StorefrontApiError("field error", { path });

    expect(error.path).toEqual(["shop", "products", 0, "title"]);
  });

  it("exposes name via Symbol.toStringTag", () => {
    const error = new StorefrontApiError("tagged");
    expect(Object.prototype.toString.call(error)).toBe("[object StorefrontApiError]");
  });

  it("stores extensions from GraphQL errors", () => {
    const extensions = { code: "THROTTLED", requestedQueryCost: 502 };
    const error = new StorefrontApiError("throttled", { extensions });

    expect(error.extensions).toEqual({
      code: "THROTTLED",
      requestedQueryCost: 502,
    });
  });

  it("populates queryText and variables in dev mode", () => {
    const error = new StorefrontApiError("fail", {
      requestId: "req-dev",
      status: 500,
      queryText: "query { shop { name } }",
      variables: { country: "US" },
    });

    expect(error.queryText).toBe("query { shop { name } }");
    expect(error.variables).toEqual({ country: "US" });
  });

  describe("toString()", () => {
    it("includes path and extensions for structured server log output", () => {
      const error = new StorefrontApiError("field not found", {
        path: ["shop", "products", 0],
        extensions: { code: "THROTTLED" },
      });

      const str = error.toString();
      expect(str).toContain("StorefrontApiError: field not found");
      expect(str).toContain('path: ["shop","products",0]');
      expect(str).toContain('extensions: {"code":"THROTTLED"}');
    });

    it("omits path and extensions sections when absent", () => {
      const error = new StorefrontApiError("plain error");
      const str = error.toString();

      expect(str).toBe("StorefrontApiError: plain error");
      expect(str).not.toContain("path:");
      expect(str).not.toContain("extensions:");
    });
  });

  describe("toJSON()", () => {
    it("strips queryText, variables, and stack", () => {
      const error = new StorefrontApiError("fail", {
        requestId: "req-456",
        status: 503,
        queryText: "query { shop { name } }",
        variables: { country: "US" },
      });

      const json = error.toJSON();
      expect(json.name).toBe("StorefrontApiError");
      expect(json.message).toBe("fail");
      expect(json.requestId).toBe("req-456");
      expect(json.status).toBe(503);
      expect(json).not.toHaveProperty("queryText");
      expect(json).not.toHaveProperty("variables");
      expect(json).not.toHaveProperty("stack");
    });

    it("produces no sensitive data via JSON.stringify", () => {
      const error = new StorefrontApiError("fail", {
        requestId: "req-789",
        status: 500,
        queryText: "mutation { customerAccessTokenCreate }",
        variables: { password: "secret123" },
      });

      const serialized = JSON.stringify(error);
      expect(serialized).not.toContain("customerAccessTokenCreate");
      expect(serialized).not.toContain("secret123");
      expect(serialized).not.toContain("stack");
    });

    it("includes locations, path, and extensions in dev mode JSON", () => {
      const error = new StorefrontApiError("gql error", {
        requestId: "req-gql",
        status: 200,
        locations: [{ line: 2, column: 3 }],
        path: ["shop", "name"],
        extensions: { code: "ACCESS_DENIED" },
      });

      const json = error.toJSON();
      expect(json.locations).toEqual([{ line: 2, column: 3 }]);
      expect(json.path).toEqual(["shop", "name"]);
      expect(json.extensions).toEqual({ code: "ACCESS_DENIED" });
    });

    it("omits undefined optional fields from JSON", () => {
      const error = new StorefrontApiError("bare");
      const json = error.toJSON();

      expect(json).toEqual({ name: "StorefrontApiError", message: "bare" });
    });

    it("toJSON is the sole serialization boundary — all paths converge here", () => {
      const error = new StorefrontApiError("sensitive op", {
        requestId: "req-boundary",
        status: 400,
        queryText: "mutation { cart { id } }",
        variables: { token: "bearer-abc" },
      });

      const viaToJSON = error.toJSON();
      const viaStringify = JSON.parse(JSON.stringify(error));

      expect(viaToJSON).toEqual(viaStringify);
      expect(viaToJSON).not.toHaveProperty("queryText");
      expect(viaToJSON).not.toHaveProperty("variables");
      expect(viaToJSON).not.toHaveProperty("stack");
      expect(viaToJSON).not.toHaveProperty("cause");
    });
  });

  /**
   * NOTE: vitest defines __DEV__ as 'true' at compile time (vitest.config.ts).
   * The __DEV__ guard in errors.ts is dead-code-eliminated in production builds
   * (tsdown replaces __DEV__ with false). Build-output verification that
   * queryText/variables are stripped in prod belongs in a build integration test,
   * not a unit test — the unit test can only verify the dev-mode path.
   *
   * What IS testable here: toJSON() strips dev-only properties regardless of
   * __DEV__ state, which is the security boundary that matters.
   */
  it("dev mode populates queryText/variables but toJSON still strips them", () => {
    const error = new StorefrontApiError("dev check", {
      queryText: "query { shop { name } }",
      variables: { lang: "EN" },
    });

    expect(error.queryText).toBe("query { shop { name } }");
    expect(error.variables).toEqual({ lang: "EN" });

    const json = error.toJSON();
    expect(json).not.toHaveProperty("queryText");
    expect(json).not.toHaveProperty("variables");
  });
});

describe("StorefrontTimeoutError", () => {
  it("extends StorefrontApiError and Error", () => {
    const error = new StorefrontTimeoutError(30_000);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(StorefrontApiError);
    expect(error).toBeInstanceOf(StorefrontTimeoutError);
  });

  it("sets name, message, and timeoutInMs", () => {
    const error = new StorefrontTimeoutError(30_000, {
      requestId: "req-timeout",
    });

    expect(error.name).toBe("StorefrontTimeoutError");
    expect(error.message).toBe("Storefront API request timed out after 30000ms");
    expect(error.timeoutInMs).toBe(30_000);
    expect(error.requestId).toBe("req-timeout");
  });
});
