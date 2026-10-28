import type { Page } from "@playwright/test";

import type { FindProductTask } from "./task";

export type ProductPageState =
  | { readonly kind: "correct"; readonly url: string; readonly headings: readonly string[] }
  | {
      readonly kind: "wrong";
      readonly url: string;
      readonly headings: readonly string[];
      readonly reason: string;
    };

/** Reads where the shopper ended up and checks it is the target product's page. */
export async function verifyProductPage(
  page: Page,
  task: FindProductTask,
): Promise<ProductPageState> {
  const headings: string[] = [];
  for (const heading of await page.getByRole("heading", { level: 1 }).all()) {
    if (await heading.isVisible()) headings.push((await heading.textContent()) ?? "");
  }
  return matchProductPage({
    url: page.url(),
    headings,
    title: task.productTitle,
    handle: task.productHandle,
  });
}

/**
 * - A main heading that is exactly the title: correct, whatever the URL.
 * - A main heading that contains the title ("Brand | Title"): correct only if the URL has the
 *   handle too, so a collection or search page sharing words with the title doesn't count.
 * - No main heading: correct if the URL has the handle.
 * A main heading naming something else is wrong even when the URL matches: that is what an error
 * page or a wrong product looks like.
 */
export function matchProductPage(input: {
  readonly url: string;
  readonly headings: readonly string[];
  readonly title: string;
  readonly handle: string;
}): ProductPageState {
  const { url, title, handle } = input;
  const headings = input.headings.map((h) => h.replaceAll(/\s+/g, " ").trim()).filter(Boolean);
  const wanted = normalizeTitle(title);
  const urlHasHandle = pathSegments(url).includes(handle);
  const correct =
    headings.some((h) => normalizeTitle(h) === wanted) ||
    (urlHasHandle &&
      (headings.length === 0 || headings.some((h) => normalizeTitle(h).includes(wanted))));
  if (correct) return { kind: "correct", url, headings };
  const shown = headings.length ? `main heading "${headings.join('", "')}"` : "no main heading";
  return {
    kind: "wrong",
    url,
    headings,
    reason: `Ended on ${new URL(url).pathname} with ${shown}, expected "${title}"`,
  };
}

/** Case- and whitespace-insensitive form used to compare titles and headings. */
export function normalizeTitle(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase().replaceAll(/\s+/g, " ").trim();
}

function pathSegments(url: string): string[] {
  return new URL(url).pathname.split("/").map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
}
