import { afterEach, describe, expect, it, vi } from "vitest";

import { StorefrontApiError, StorefrontTimeoutError } from "../client/errors";
import { configureLogging } from "./logging";
import { withStorefrontRateLimit } from "./storefront-rate-limit";
import { createTestLogger } from "./test-utils";

const UPSTREAM_BODY = "upstream-private-diagnostic";

function rateLimitError(retryAfter?: string) {
  return new StorefrontApiError(`SFAPI responded with 429: ${UPSTREAM_BODY}`, {
    status: 429,
    requestId: "internal-request-id",
    retryAfter,
  });
}

async function catchThrown(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected the wrapped loader to throw");
    },
    (caught: unknown) => caught,
  );
}

async function thrownResponse(loader: () => unknown): Promise<Response> {
  const thrown = await catchThrown(withStorefrontRateLimit(loader)());
  if (!(thrown instanceof Response)) throw new Error("expected a thrown Response");
  return thrown;
}

async function rateLimitResponse(error: unknown): Promise<Response> {
  return thrownResponse(() => {
    throw error;
  });
}

afterEach(() => {
  configureLogging({});
  vi.restoreAllMocks();
});

describe("withStorefrontRateLimit", () => {
  it("throws a 429 response with a fixed body, no-store, and the Retry-After value", async () => {
    configureLogging({ logger: createTestLogger() });

    const response = await rateLimitResponse(rateLimitError("30"));

    expect(response.status).toBe(429);
    expect([...response.headers]).toEqual([
      ["cache-control", "no-store"],
      ["content-type", "text/plain;charset=UTF-8"],
      ["retry-after", "30"],
    ]);
    const body = await response.text();
    expect(body).toBe("Too many requests. Please try again later.");
    expect(body).not.toContain(UPSTREAM_BODY);
  });

  it("logs the Storefront API error once before it throws the response", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const error = rateLimitError("30");

    await rateLimitResponse(error);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith("storefront api rate limited the request", {
      scope: "rate-limit",
      error,
    });
    for (const level of ["trace", "debug", "info", "warn", "fatal"] as const) {
      expect(logger[level]).not.toHaveBeenCalled();
    }
  });

  it("still throws the 429 response when the configured logger fails", async () => {
    const logger = createTestLogger();
    logger.error.mockImplementation(() => {
      throw new Error("logger unavailable");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    configureLogging({ logger });

    const response = await rateLimitResponse(rateLimitError("30"));

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
  });

  it.each(["0", "5", "00030", "99999999999", "Thu, 29 Oct 2026 19:00:00 GMT"])(
    "keeps the valid Retry-After value %j unchanged",
    async (retryAfter) => {
      configureLogging({ logger: createTestLogger() });

      const response = await rateLimitResponse(rateLimitError(retryAfter));

      expect(response.headers.get("retry-after")).toBe(retryAfter);
    },
  );

  it.each([
    "",
    " 5",
    "-1",
    "1.5",
    "soon",
    "5; x-internal=1",
    "2026-10-29T19:00:00Z",
    "Wed, 29 Oct 2026 19:00:00 GMT",
    "Mon, 30 Feb 2026 19:00:00 GMT",
    "Thu, 29 Oct 2026 19:00:00 GMT\r\nx-internal: 1",
  ])("omits the invalid Retry-After value %j", async (retryAfter) => {
    configureLogging({ logger: createTestLogger() });

    const response = await rateLimitResponse(rateLimitError(retryAfter));

    expect(response.status).toBe(429);
    expect(response.headers.has("retry-after")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("omits Retry-After when the Storefront API sent none", async () => {
    configureLogging({ logger: createTestLogger() });

    const response = await rateLimitResponse(rateLimitError());

    expect(response.status).toBe(429);
    expect(response.headers.has("retry-after")).toBe(false);
  });

  it("rethrows other errors unchanged and doesn't log them", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const errors = [
      new StorefrontApiError("SFAPI responded with 401", { status: 401 }),
      new StorefrontApiError("SFAPI responded with 403", { status: 403 }),
      new StorefrontApiError("SFAPI responded with 500", { status: 500, retryAfter: "30" }),
      new StorefrontApiError("network failure"),
      new StorefrontTimeoutError(1000),
      Object.assign(new Error("application failure"), { status: 429, retryAfter: "30" }),
      { status: 429 },
      new Response("Not Found", { status: 404 }),
      new Response("Too many requests", { status: 429, headers: { "Retry-After": "30" } }),
    ];

    for (const error of errors) {
      const thrown = await catchThrown(
        withStorefrontRateLimit(() => {
          throw error;
        })(),
      );
      expect(thrown).toBe(error);
    }
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("maps a rate limit that an async loader throws", async () => {
    configureLogging({ logger: createTestLogger() });

    const response = await thrownResponse(async () => {
      throw rateLimitError("5");
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("5");
  });

  it("resolves to the loader result and passes the loader arguments", async () => {
    const loader = withStorefrontRateLimit((a: number, b: string) => ({ value: `${b}${a}` }));
    const asyncLoader = withStorefrontRateLimit(async (a: number) => a * 2);

    await expect(loader(1, "id-")).resolves.toEqual({ value: "id-1" });
    await expect(asyncLoader(21)).resolves.toBe(42);
  });
});
