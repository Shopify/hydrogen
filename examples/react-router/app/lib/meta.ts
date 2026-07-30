/**
 * Meta helpers (`hydrogen-setup` / F10). The shop name lives on the **root**
 * loader's data (`loaderData.shopName`), so child-route `meta()` functions read
 * it off `matches` (the parent route data) rather than re-fetching. Falls back
 * to `"CORE"` only if the root loader hasn't resolved yet.
 *
 * `matches` is typed loosely (`unknown`) because the generated route `MetaArgs`
 * tuple doesn't carry per-match `data` statically — the root match's `data` is
 * present at runtime.
 */
export function shopNameFromMatches(matches: unknown): string {
  const root = (matches as ReadonlyArray<{ id: string; data?: unknown }> | undefined)?.find(
    (m) => m?.id === "root",
  );
  return (root?.data as { shopName?: string } | undefined)?.shopName ?? "CORE";
}

/** `<title>` + OG title builder: `${pageTitle} — ${shopName}`. */
export function shopTitle(pageTitle: string, shopName: string): string {
  return `${pageTitle} — ${shopName}`;
}
