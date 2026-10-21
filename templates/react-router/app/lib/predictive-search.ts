import type { PredictiveSearchStatus } from "@shopify/hydrogen";

type SuggestionSummary = {
  status: PredictiveSearchStatus;
  result: { term: string; items: { products: readonly unknown[] } };
};

/**
 * Live-region text for the suggestion list. Only a settled result is
 * announced: the store flips to `loading` on every keystroke, and announcing
 * that would talk over the typist.
 */
export function describeSuggestions({ status, result }: SuggestionSummary): string {
  if (status !== "success") return "";
  const count = result.items.products.length;
  if (count === 0) return `No suggestions for “${result.term}”`;
  return `${count} ${count === 1 ? "suggestion" : "suggestions"} for “${result.term}”`;
}
