import { DEFAULT_SITE_ORIGIN } from "./site";

type RootRouteData = { shopName?: string; siteOrigin?: string };

export function shopNameFromMatches(matches: unknown): string {
  return rootDataFromMatches(matches)?.shopName ?? "CORE";
}

export function shopTitle(pageTitle: string, shopName: string): string {
  return `${pageTitle} — ${shopName}`;
}

export function siteOriginFromMatches(matches: unknown): string {
  return rootDataFromMatches(matches)?.siteOrigin ?? DEFAULT_SITE_ORIGIN;
}

function rootDataFromMatches(matches: unknown): RootRouteData | undefined {
  const root = (matches as ReadonlyArray<{ id: string; data?: unknown }> | undefined)?.find(
    (match) => match?.id === "root",
  );
  return root?.data as RootRouteData | undefined;
}
