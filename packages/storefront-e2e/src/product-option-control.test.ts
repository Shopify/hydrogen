import type { Locator } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";

import {
  activateProductOption,
  expectNativeProductOptionSelected,
  productOptionControlKind,
} from "./product-option-control";

const nativeExpect = vi.hoisted(() => ({
  toBeEnabled: vi.fn(),
  toBeFocused: vi.fn(),
  toHaveAttribute: vi.fn(),
  toBeChecked: vi.fn(),
}));
vi.mock("@playwright/test", () => ({ expect: () => nativeExpect }));

function controlFixture(tagName: string, attributes: Record<string, string> = {}, clipped = false) {
  const element = {
    tagName,
    hasAttribute: (name: string) => name in attributes,
    getAttribute: (name: string) => attributes[name] ?? null,
  } as unknown as Element;
  const control = {
    evaluate: async (fn: (element: Element) => unknown) => fn(element),
    boundingBox: async () => ({ x: 0, y: 0, width: clipped ? 1 : 40, height: clipped ? 1 : 40 }),
    click: vi.fn(),
    focus: vi.fn(),
    press: vi.fn(),
  };
  return { control, locator: control as unknown as Locator };
}

describe("per-value product option controls", () => {
  it.each([
    ["A", { href: "/products/shirt?Color=Blue" }, "link"],
    ["BUTTON", {}, "button"],
    ["INPUT", { type: "radio" }, "radio"],
    ["INPUT", { type: "checkbox" }, "checkbox"],
    ["SELECT", {}, null],
    ["OPTION", {}, null],
    ["A", {}, null],
    ["INPUT", { type: "hidden" }, null],
  ] as const)("recognizes %s with %o as %s", async (tag, attrs, expected) => {
    expect(await productOptionControlKind(controlFixture(tag, attrs).locator)).toBe(expected);
  });

  it("uses a native click for visible links, including the no-JS path", async () => {
    const { control, locator } = controlFixture("A", { href: "/products/shirt?Color=Blue" });
    await activateProductOption(locator);
    expect(control.click).toHaveBeenCalledWith();
    expect(control.press).not.toHaveBeenCalled();
  });

  it.each(["radio", "checkbox"])(
    "uses checked native keyboard activation for a clipped %s",
    async (type) => {
      const { control, locator } = controlFixture("INPUT", { type }, true);
      await activateProductOption(locator);
      expect(control.focus).toHaveBeenCalledWith();
      expect(control.press).toHaveBeenCalledWith("Space");
      expect(control.click).not.toHaveBeenCalled();
    },
  );

  it("uses keyboard activation for a clipped link without forcing a click", async () => {
    const { control, locator } = controlFixture("A", { href: "/products/shirt?Color=Blue" }, true);
    await activateProductOption(locator);
    expect(control.focus).toHaveBeenCalledWith();
    expect(control.press).toHaveBeenCalledWith("Enter");
    expect(control.click).not.toHaveBeenCalled();
  });

  it("rejects select pickers instead of expanding the per-value contract", async () => {
    const { control, locator } = controlFixture("SELECT");
    await expect(activateProductOption(locator)).rejects.toThrow(
      "select pickers are not supported",
    );
    expect(control.click).not.toHaveBeenCalled();
  });

  it("keeps native link, button, and input selected-state assertions", async () => {
    await expectNativeProductOptionSelected(controlFixture("A", { href: "?Color=Blue" }).locator);
    expect(nativeExpect.toHaveAttribute).toHaveBeenCalledWith("aria-current", "true");
    await expectNativeProductOptionSelected(controlFixture("BUTTON").locator);
    expect(nativeExpect.toHaveAttribute).toHaveBeenCalledWith("aria-pressed", "true");
    await expectNativeProductOptionSelected(controlFixture("INPUT", { type: "radio" }).locator);
    expect(nativeExpect.toBeChecked).toHaveBeenCalled();
  });
});
