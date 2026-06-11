import { expect } from "vitest";

export function assert<T>(value: T | null | undefined, message: string): asserts value is T {
  expect(value != null, message).toBe(true);
}
