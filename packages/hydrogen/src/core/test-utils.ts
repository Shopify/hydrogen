import { expect, vi } from "vitest";

import type { LogSeverity } from "./logging";

export function assert<T>(value: T | null | undefined, message: string): asserts value is T {
  expect(value != null, message).toBe(true);
}

/**
 * Simulates a browser opaque response, such as a `redirect: "manual"` redirect: status 0, no
 * headers, and no body. Node can't construct one because `new Response()` rejects status 0.
 */
export function createOpaqueResponse(type: "opaque" | "opaqueredirect"): Response {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: type });
  Object.defineProperty(response, "status", { value: 0 });
  Object.defineProperty(response, "ok", { value: false });
  return response;
}

type TestLogger = Record<LogSeverity, ReturnType<typeof vi.fn>>;

export function createTestLogger(): TestLogger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
}
