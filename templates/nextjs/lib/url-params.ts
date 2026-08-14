/**
 * Adapt a Next.js App Router `searchParams` record (`Record<string, string |
 * string[] | undefined>`) into a `URLSearchParams` for Hydrogen helpers that
 * expect a `URLSearchParams` (`getSelectedProductOptions`, `parseCollectionParams`).
 *
 * `searchParams` is a `Promise<Record<...>>` in Next 15+ — `await` it first.
 */
export function toURLSearchParams(
  input: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  return params;
}
