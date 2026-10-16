import { expect, type Locator } from "@playwright/test";

/** Native controls supported by the per-value product option contract. Select pickers are not supported. */
export async function productOptionControlKind(
  control: Locator,
): Promise<"link" | "button" | "radio" | "checkbox" | null> {
  return control.evaluate((element) => {
    const tag = element.tagName.toLowerCase();
    if (tag === "a" && element.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    const type = element.getAttribute("type");
    if (tag === "input" && (type === "radio" || type === "checkbox")) return type;
    return null;
  });
}

/** Use native keyboard activation for clipped controls. Never force a click through another element. */
export async function activateProductOption(control: Locator): Promise<void> {
  const kind = await productOptionControlKind(control);
  if (kind === null)
    throw new Error(
      "Product option values need a link, button, radio, or checkbox; select pickers are not supported.",
    );
  await expect(control).toBeEnabled();
  const box = await control.boundingBox();
  if (
    kind === "radio" ||
    kind === "checkbox" ||
    box === null ||
    box.width <= 1 ||
    box.height <= 1
  ) {
    await control.focus();
    await expect(control).toBeFocused();
    await control.press(kind === "radio" || kind === "checkbox" ? "Space" : "Enter");
    return;
  }
  await control.click();
}

export async function expectNativeProductOptionSelected(control: Locator): Promise<void> {
  const kind = await productOptionControlKind(control);
  if (kind === "link") await expect(control).toHaveAttribute("aria-current", "true");
  else if (kind === "button") await expect(control).toHaveAttribute("aria-pressed", "true");
  else if (kind === "radio" || kind === "checkbox") await expect(control).toBeChecked();
  else throw new Error("Selected product option has no supported native control state.");
}
