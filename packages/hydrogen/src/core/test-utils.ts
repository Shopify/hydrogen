import { expect, vi } from "vitest";

import type { LogSeverity } from "./logging";

export function assert<T>(value: T | null | undefined, message: string): asserts value is T {
  expect(value != null, message).toBe(true);
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
