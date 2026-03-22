import {expect} from '@playwright/test';

/** Asserts that a condition is truthy while narrowing its type */
export default function assert(
  condition: any,
  message?: string,
): asserts condition {
  expect(condition, message).toBeTruthy();
}
