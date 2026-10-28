import type { BrowserContext } from "@playwright/test";

// Chrome draws a native <select>'s option list outside the page, so it never appears in
// screenshots and a screenshot-only agent can't pick an option. Customizable select
// (appearance: base-select) draws the list inside the page instead. Only rendering changes; the
// store's markup and behaviour stay the same.
const CSS = "select, ::picker(select) { appearance: base-select; }";

/** Makes every <select> in the context draw its option list where screenshots can see it. */
export async function renderSelectsInPage(context: BrowserContext): Promise<void> {
  await context.addInitScript((css: string) => {
    const add = () => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.append(style);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
    else add();
  }, CSS);
}
